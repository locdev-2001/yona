<?php

namespace App\Modules\Chat\Adapter\ZaloPersonal\Intake;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Kéo lại tin bị mất trong gap kết nối — phủ CẢ 1-1 lẫn nhóm.
 *
 * Hai lane:
 *   1. WS /backfill/threads — listener.requestOldMessages (cmd 510/511): ~48 tin
 *      gần nhất mỗi lane (user + group), về ASYNC qua webhook old_messages.
 *      Đường sync CHÍNH từ 07/2026 (REST group/history bị Zalo 404 upstream).
 *   2. REST /backfill/group per-conversation — giữ lại: tự fail êm nếu Zalo còn
 *      chặn, tự sống lại nếu Zalo mở endpoint (kéo sâu hơn WS: 100 tin/nhóm).
 *
 * Dùng cho cả:
 *   - Manual: POST /inbox/resync (InboxController@resync)
 *   - Auto on reconnect: ZaloPersonalWebhookController::handleBridgeSession (khi có gap)
 *   - Auto on WS connect: bridge tự requestThreadBackfill (không qua class này)
 *
 * Idempotent: webhook ingest dedup theo (conversation_id, source_id).
 *
 * @see ZaloPersonalWebhookController::handleBridgeSession
 */
class ZaloBackfillService
{
    /**
     * Backfill toàn bộ cho connection: lane WS (1-1 + nhóm) rồi lane REST per-group.
     *
     * @param  int  $deepDays  > 0 → bridge deep sync cursor lùi tới mốc này (resync
     *                         thủ công dùng 30); 0 → single-shot window gần nhất
     *                         (auto reconnect — gap ngắn, không cần kéo sâu).
     * @return int Tổng số tin lane REST đã kéo (lane WS về async — không đếm được).
     */
    public function run(int $connectionId, int $deepDays = 0): int
    {
        $bridgeUrl = rtrim((string) config('services.zalo_bridge.url'), '/');
        $uiSecret = (string) config('services.zalo_bridge.ui_secret');

        $this->requestThreadBackfill($bridgeUrl, $uiSecret, $connectionId, $deepDays);

        // P08: conversations key theo channel_account_id (không còn zalo_connection_id) —
        // resolve account của slot trước. Slot chưa gắn account (chưa từng promote) → không có gì để backfill.
        $channelAccountId = DB::table('zalo_connections')->where('connection_id', $connectionId)->value('channel_account_id');

        if ($channelAccountId === null) {
            return 0;
        }

        // Default connection (RLS đã bind bởi caller: webhook bind trước khi gọi, controller dùng workspace middleware)
        $groupConversations = DB::table('conversations')
            ->where('channel_account_id', $channelAccountId)
            ->where('thread_type', 1)
            ->whereNull('deleted_at')
            ->get(['peer_uid']);

        $totalFetched = 0;

        foreach ($groupConversations as $conv) {
            try {
                $response = Http::withHeaders([
                    'X-Bridge-UI-Secret' => $uiSecret,
                ])->timeout(15)->post("{$bridgeUrl}/backfill/group", [
                    'connection_id' => $connectionId,
                    'group_id' => $conv->peer_uid,
                    'count' => 100,
                ]);

                if ($response->successful()) {
                    $totalFetched += (int) ($response->json('fetched') ?? 0);
                } else {
                    Log::warning('zalo_group_backfill: bridge error', [
                        'connection_id' => $connectionId,
                        'group_id' => $conv->peer_uid,
                        'status' => $response->status(),
                        'body' => $response->body(),
                    ]);
                }
            } catch (ConnectionException $e) {
                Log::warning('zalo_group_backfill: bridge unreachable', [
                    'connection_id' => $connectionId,
                    'group_id' => $conv->peer_uid,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $totalFetched;
    }

    /** Lane WS — fail êm (log warning), không chặn lane REST phía sau. */
    private function requestThreadBackfill(string $bridgeUrl, string $uiSecret, int $connectionId, int $deepDays = 0): void
    {
        try {
            $response = Http::withHeaders([
                'X-Bridge-UI-Secret' => $uiSecret,
            ])->timeout(15)->post("{$bridgeUrl}/backfill/threads", array_filter([
                'connection_id' => $connectionId,
                'days' => $deepDays,
            ]));

            if (! $response->successful()) {
                Log::warning('zalo_thread_backfill: bridge error', [
                    'connection_id' => $connectionId,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
            }
        } catch (ConnectionException $e) {
            Log::warning('zalo_thread_backfill: bridge unreachable', [
                'connection_id' => $connectionId,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
