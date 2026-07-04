<?php

namespace App\Http\Controllers\Integration;

use App\Http\Middleware\VerifyZaloBridgeSecret;
use App\Models\Workspace;
use App\Models\ZaloConnection;
use App\Modules\Integration\ChannelManager;
use App\Services\InboundMessageService;
use App\Services\ZaloGroupBackfillService;
use App\Support\TenantScope;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

/**
 * Nhận webhook từ Zalo personal bridge.
 *
 * ⚠️ CATASTROPHIC RISK: RLS bind phải đúng thứ tự:
 *   1. TenantScope::forget() — reset pooled connection (F19)
 *   2. Resolve workspace_id từ connection_id qua pgsql_privileged (bypass RLS)
 *   3. TenantScope::bind($workspaceId)
 *   4. try { xử lý } finally { TenantScope::forget() }
 *
 * 4 event types:
 *   - inbound       → parse + ingest (InboundMessageService, always-accept F13/F20)
 *   - bridge_session → update ZaloConnection.state
 *   - social_event  → log/no-op (YAGNI)
 *   - relay_event   → lưu relay_events (P10 — 11 event zca chưa có handler product)
 *   - default       → CŨNG lưu relay_events (P10/H1: event lạ KHÔNG drop im lặng)
 *
 * Route: POST /api/integrations/zalo-personal/webhook
 * Middleware: zalo.bridge.secret (VerifyZaloBridgeSecret)
 *
 * @see routes/api.php
 * @see VerifyZaloBridgeSecret
 */
class ZaloPersonalWebhookController extends Controller
{
    // Internal-first: ChannelManager (app/Modules/Integration/) resolve lazily trong
    // handleInbound — KHÔNG inject qua constructor để route:list không fatal khi xóa Integration.
    public function __construct(
        private readonly InboundMessageService $inboundMessageService,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        // ⚠️ F19: Reset ngay — tránh scope leak từ request trước trên pooled connection
        TenantScope::forget();

        $payload = $request->all();
        $eventType = $payload['type'] ?? 'inbound';

        // Resolve connection_id
        $connectionId = isset($payload['connection_id']) ? (int) $payload['connection_id'] : 0;
        if ($connectionId <= 0) {
            return response()->json(['ok' => false, 'message' => 'missing connection_id'], 400);
        }

        // Resolve workspace qua pgsql_privileged (bypass RLS — chưa biết workspace)
        $workspaceId = ZaloConnection::workspaceForConnection($connectionId);
        if ($workspaceId === null) {
            // connection_id chưa map → 202 (không tạo orphan, không 404 — F13 inbound always-accept logic)
            return response()->json(['ok' => true, 'message' => 'connection_not_mapped'], 202);
        }

        try {
            // ⚠️ F5/Finding5: bind() VÀO TRONG try — nếu Workspace::find() throw,
            // finally{forget} vẫn chạy. Trước đây nằm ngoài → scope leak-on-throw.
            TenantScope::bind($workspaceId);

            // Bind currentWorkspace vào container (WorkspaceSequence::next() cần) —
            // bình thường IdentifyWorkspace middleware làm điều này, webhook route không có middleware đó.
            app()->instance('currentWorkspace', Workspace::withoutGlobalScopes()->find($workspaceId));

            return match ($eventType) {
                'inbound' => $this->handleInbound($payload),
                'bridge_session' => $this->handleBridgeSession($payload),
                'social_event' => $this->handleSocialEvent($payload),
                // P10/H1: relay_event (forwarder generic P12) + event type LẠ → đều
                // ghi relay_events, KHÔNG drop im lặng. KHÔNG tính metering (F1/F14).
                default => $this->handleRelayEvent($payload, $eventType),
            };
        } finally {
            // ⚠️ F19: LUÔN forget sau request — pooled connection an toàn
            TenantScope::forget();
            app()->forgetInstance('currentWorkspace');
        }
    }

    /**
     * Inbound message từ bridge → parse + ingest.
     * KHÔNG gọi gate (F13/F20: inbound always-accept, fail-safe).
     *
     * Contract HTTP (outbox classify):
     *   200 → done (xóa khỏi outbox)
     *   422 → dead-letter (payload hỏng vĩnh viễn, không retry)
     *   503 → retry (DB transient, bridge giữ + backoff)
     *
     * @param  array<string, mixed>  $payload
     */
    private function handleInbound(array $payload): JsonResponse
    {
        try {
            // P08: resolve channel_account_id của slot (kể cả trashed) — 1 nguồn sự thật
            // duy nhất cho upsertConversation, thay vì zalo_connection_id/personal_uid.
            $connectionId = (int) ($payload['connection_id'] ?? 0);
            $payload['channel_account_id'] = $connectionId > 0
                ? ZaloConnection::channelAccountIdForConnection($connectionId)
                : null;

            $driver = app(ChannelManager::class)->driver('zalo_personal');
            $normalized = $driver->parseInbound($payload);
            $this->inboundMessageService->ingest($normalized);

            return response()->json(['ok' => true]);
        } catch (QueryException|\PDOException $e) {
            // Transient DB error (down, deadlock, lock timeout) → 503 → outbox retry
            $this->safeReport($e);

            return response()->json(['ok' => false, 'message' => 'transient_db_error'], 503);
        } catch (\InvalidArgumentException $e) {
            // Payload hỏng / driver thiếu → permanent → 422 → dead-letter, không retry vô tận
            $this->safeReport($e);

            return response()->json(['ok' => false, 'message' => 'permanent_bad_payload'], 422);
        } catch (Throwable $e) {
            // Unknown — thà giữ lại để retry hơn mất tin
            $this->safeReport($e);

            return response()->json(['ok' => false, 'message' => 'unexpected_error'], 503);
        }
    }

    /**
     * Bọc report() để tránh throw khi log channel = database đang down (H-5).
     */
    private function safeReport(Throwable $e): void
    {
        try {
            report($e);
        } catch (Throwable) {
            error_log('zalo webhook report() failed: '.$e->getMessage());
        }
    }

    /**
     * Bridge session state update → cập nhật ZaloConnection.state.
     *
     * state values từ bridge: session_ok | session_lost
     * Map sang model: session_ok → connected | session_lost → session_lost
     *
     * @param  array<string, mixed>  $payload
     */
    private function handleBridgeSession(array $payload): JsonResponse
    {
        $connectionId = (int) ($payload['connection_id'] ?? 0);
        $bridgeState = $payload['state'] ?? '';
        $detail = $payload['detail'] ?? null;

        $modelState = match ($bridgeState) {
            'session_ok' => 'connected',
            'session_lost' => 'session_lost',
            default => null,
        };

        if ($modelState === null || $connectionId <= 0) {
            return response()->json(['ok' => true, 'message' => 'noop']);
        }

        $connection = ZaloConnection::where('connection_id', $connectionId)->first();
        if ($connection === null) {
            return response()->json(['ok' => true, 'message' => 'connection_not_found'], 200);
        }

        $hadGap = $connection->last_session_lost_at !== null
            || $connection->state === 'session_lost';

        // P05: mở cửa sổ gap account-level — CHỈ set gap_started_at lần ĐẦU (gap_open
        // còn false); session_lost lặp lại (bridge chập chờn) không đẩy lùi mốc bắt đầu.
        // Đóng lại ở PromoteAccountBinder (P04) khi reconnect thành công.
        if ($modelState === 'session_lost' && $connection->channel_account_id !== null) {
            DB::connection('pgsql_privileged')->table('channel_accounts')
                ->where('id', $connection->channel_account_id)
                ->where('gap_open', false)
                ->update(['gap_started_at' => now(), 'gap_open' => true, 'updated_at' => now()]);
        }

        $connection->updateState($modelState, $detail);

        // ponytail: inline backfill — chưa có DB-queue worker; chuyển Job khi có worker
        if ($modelState === 'connected' && $hadGap) {
            try {
                app(ZaloGroupBackfillService::class)->run($connectionId);
            } catch (Throwable $e) {
                // Không để lỗi backfill phá update state
                $this->safeReport($e);
            }
        }

        // TODO D-2: broadcast ZaloConnectionStateChanged event khi có realtime FE

        return response()->json(['ok' => true, 'state' => $modelState]);
    }

    /**
     * P10 — relay_event từ forwarder generic (P12) + event type LẠ: lưu vào
     * relay_events thay vì drop im lặng (red-team H1). KHÔNG tính metering
     * (F1/F14 — kho quan sát, không phải message tenant trả lời).
     *
     * Idempotent theo unique partial (workspace_id, event_type, source_id):
     * bridge retry → 23505 → 200 dedup. Contract HTTP như handleInbound:
     * 200 done · 422 payload hỏng vĩnh viễn · 503 DB transient (outbox retry).
     *
     * @param  array<string, mixed>  $payload
     */
    private function handleRelayEvent(array $payload, string $eventType): JsonResponse
    {
        // relay_event envelope (P12/H2) mang event_type riêng; type lạ → dùng chính type đó.
        $relayEventType = $eventType === 'relay_event'
            ? (string) ($payload['event_type'] ?? '')
            : $eventType;

        if ($relayEventType === '') {
            return response()->json(['ok' => false, 'message' => 'missing_event_type'], 422);
        }

        $connectionId = (int) ($payload['connection_id'] ?? 0);
        $sourceId = isset($payload['source_id']) && $payload['source_id'] !== '' ? (string) $payload['source_id'] : null;

        try {
            // insertOrIgnore (ON CONFLICT DO NOTHING) thay vì catch 23505: lỗi unique
            // trong Postgres abort cả transaction bao ngoài — dedup phải không-lỗi.
            $inserted = DB::table('relay_events')->insertOrIgnore([
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'workspace_id' => currentWorkspace()->id,
                'channel_account_id' => $connectionId > 0
                    ? ZaloConnection::channelAccountIdForConnection($connectionId)
                    : null,
                'connection_id' => $connectionId > 0 ? $connectionId : null,
                'event_type' => mb_substr($relayEventType, 0, 32),
                'personal_uid' => isset($payload['personal_uid']) ? mb_substr((string) $payload['personal_uid'], 0, 64) : null,
                'source_id' => $sourceId,
                'payload' => json_encode($payload['payload'] ?? $payload),
                'received_at' => now(),
                'created_at' => now(),
            ]);
        } catch (QueryException|\PDOException $e) {
            $this->safeReport($e);

            return response()->json(['ok' => false, 'message' => 'transient_db_error'], 503);
        }

        return response()->json([
            'ok' => true,
            'message' => $inserted > 0 ? 'relay_event_stored' : 'relay_event_duplicate',
        ], 200);
    }

    /**
     * Social event (group_event, friend_event) — log/no-op.
     * ponytail: YAGNI — chỉ log ở D-1, xử lý sau khi có use case rõ.
     *
     * @param  array<string, mixed>  $payload
     */
    private function handleSocialEvent(array $payload): JsonResponse
    {
        // ponytail: social_event no-op D-1 — chỉ accept 200 để bridge không retry
        return response()->json(['ok' => true, 'message' => 'social_event_accepted']);
    }
}
