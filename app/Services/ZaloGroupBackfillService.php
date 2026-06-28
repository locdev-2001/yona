<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Kéo lại tin nhóm bị mất trong gap kết nối bằng cách gọi bridge /backfill/group.
 *
 * Dùng cho cả:
 *   - Manual: POST /inbox/resync (InboxController@resync)
 *   - Auto on reconnect: ZaloPersonalWebhookController::handleBridgeSession (khi có gap)
 *
 * Idempotent: bridge gọi buildGroupBackfillPayload → webhook ingest dedup theo (conversation_id, source_id).
 *
 * @see ZaloPersonalWebhookController::handleBridgeSession
 */
class ZaloGroupBackfillService
{
    /**
     * Kéo backfill tất cả conversation nhóm (thread_type=1) của connection.
     *
     * @return int Tổng số tin đã yêu cầu kéo (fetched từ bridge, không phải tin mới trong DB).
     */
    public function run(int $connectionId): int
    {
        $bridgeUrl = rtrim((string) config('services.zalo_bridge.url'), '/');
        $uiSecret = (string) config('services.zalo_bridge.ui_secret');

        // Default connection (RLS đã bind bởi caller: webhook bind trước khi gọi, controller dùng workspace middleware)
        $groupConversations = DB::table('conversations')
            ->where('zalo_connection_id', $connectionId)
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
}
