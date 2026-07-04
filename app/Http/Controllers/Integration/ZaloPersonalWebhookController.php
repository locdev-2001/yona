<?php

namespace App\Http\Controllers\Integration;

use App\Events\ConversationTyping;
use App\Http\Middleware\VerifyZaloBridgeSecret;
use App\Models\Conversation;
use App\Models\Workspace;
use App\Models\ZaloConnection;
use App\Modules\Integration\ChannelManager;
use App\Modules\Integration\Chat\ZaloPersonal\ZaloStateEventParser;
use App\Services\InboundMessageService;
use App\Services\Inbox\MessageStateService;
use App\Services\ZaloGroupBackfillService;
use App\Support\TenantScope;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
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
 * Event types:
 *   - inbound        → parse + ingest (InboundMessageService, always-accept F13/F20)
 *   - bridge_session → update ZaloConnection.state
 *   - social_event   → log/no-op (YAGNI)
 *   - relay_event    → P02: undo/seen/delivered/reaction ĐI THEO messages
 *                      (MessageStateService); typing broadcast-only; lạ → log redacted.
 *                      KHÔNG còn ghi relay_events (bảng drop ở P09).
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

        // P05: đồng bộ account-level state + cửa sổ gap theo 2 chiều:
        //  - session_lost → mở gap: CHỈ set gap_started_at lần ĐẦU (gap_open còn false);
        //    session_lost lặp lại (bridge chập chờn) không đẩy lùi mốc bắt đầu.
        //  - session_ok → ĐÓNG gap (gap_open=false, GIỮ gap_started_at cho marker các
        //    hội thoại chưa kịp nhận tin post-gap). Đường này là cookie-restore reconnect
        //    (bridge tự khôi phục, KHÔNG qua PromoteAccountBinder) — nếu không đóng ở
        //    đây, gap kế tiếp không set được gap_started_at mới → marker gap 2+ bị nuốt
        //    (unique conversation_events trùng gap_started_at cũ) và account status
        //    kẹt 'session_lost' vĩnh viễn trên UI.
        // pgsql_privileged — NHẤT QUÁN với updateState() + mọi ghi khác trong handler
        // này. KHÔNG đổi sang connection mặc định: default session của test giữ lock
        // row zalo_connections trong transaction → updateState (privileged) chờ lock
        // → treo chéo session (đã dính khi review 04/07).
        if ($connection->channel_account_id !== null) {
            $accountQuery = fn () => DB::connection('pgsql_privileged')->table('channel_accounts')
                ->where('id', $connection->channel_account_id);

            if ($modelState === 'session_lost') {
                $accountQuery()->where('gap_open', false)
                    ->update(['gap_started_at' => now(), 'gap_open' => true, 'updated_at' => now()]);
                $accountQuery()->update(['status' => 'session_lost', 'updated_at' => now()]);
            } else {
                $accountQuery()->update(['status' => 'connected', 'gap_open' => false, 'updated_at' => now()]);
            }
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
     * P02 (inbox-full-messaging-framework) — 5 event trạng-thái-tin đi THẲNG vào
     * messages theo taxonomy 4 loại, NGỪNG ghi kho relay_events (bảng drop ở P09).
     * KHÔNG tính metering (F1/F14 — trạng thái tin, không phải tin tenant trả lời).
     *
     * Lane theo độ quan trọng:
     *  - undo (nghiệp vụ, durable outbox): 200 applied/pending · 422 payload hỏng · 503 DB transient
     *  - seen/delivered/reaction (chatty, fire-and-forget): LUÔN 200, lỗi swallow —
     *    drop-on-miss là CHỦ ĐÍCH (bridge không retry lane này)
     *  - typing: broadcast-only, KHÔNG DB (taxonomy loại 1)
     *  - connected/disconnected/upload_attachment: phù du đã biết → 200 skip
     *  - LẠ: structured log redacted (event_type + keys, KHÔNG payload thô) + 200
     *
     * @param  array<string, mixed>  $payload
     */
    private function handleRelayEvent(array $payload, string $eventType): JsonResponse
    {
        $relayEventType = $eventType === 'relay_event'
            ? (string) ($payload['event_type'] ?? '')
            : $eventType;

        if ($relayEventType === '') {
            return response()->json(['ok' => false, 'message' => 'missing_event_type'], 422);
        }

        $connectionId = (int) ($payload['connection_id'] ?? 0);
        $channelAccountId = $connectionId > 0
            ? ZaloConnection::channelAccountIdForConnection($connectionId)
            : null;
        $eventPayload = is_array($payload['payload'] ?? null) ? $payload['payload'] : [];

        $parser = app(ZaloStateEventParser::class);
        $stateService = app(MessageStateService::class);

        switch ($relayEventType) {
            case 'undo':
                $recall = $parser->parseUndo($eventPayload);
                if ($recall === null) {
                    return response()->json(['ok' => false, 'message' => 'undo_target_missing'], 422);
                }
                try {
                    $result = $stateService->applyRecall($channelAccountId, $recall);
                } catch (QueryException|\PDOException $e) {
                    $this->safeReport($e);

                    return response()->json(['ok' => false, 'message' => 'transient_db_error'], 503);
                }

                return response()->json(['ok' => true, 'message' => "undo_{$result}"]);

            case 'seen_messages':
            case 'delivered_messages':
                $kind = $relayEventType === 'seen_messages' ? 'seen' : 'delivered';
                try {
                    $stateService->applyReceipts($channelAccountId, $parser->parseReceipts($eventPayload, $kind));
                } catch (Throwable $e) {
                    $this->safeReport($e); // chatty: mất receipt không mất nghiệp vụ
                }

                return response()->json(['ok' => true, 'message' => 'receipts_processed']);

            case 'reaction':
            case 'old_reactions':
                try {
                    $stateService->applyReactions($channelAccountId, $parser->parseReactions($eventPayload));
                } catch (Throwable $e) {
                    $this->safeReport($e);
                }

                return response()->json(['ok' => true, 'message' => 'reactions_processed']);

            case 'typing':
                $this->broadcastTyping($channelAccountId, $parser->parseTyping($eventPayload));

                return response()->json(['ok' => true, 'message' => 'typing_broadcast']);

            case 'connected':
            case 'disconnected':
            case 'upload_attachment':
                // Phù du đã biết — không có đích DB theo taxonomy, không log spam
                return response()->json(['ok' => true, 'message' => 'relay_event_ephemeral_skipped']);

            default:
                // Event LẠ — observability tối thiểu (P09 thêm rate-limit + alert):
                // redact — chỉ event_type + shape keys, KHÔNG payload thô.
                logger()->warning('zalo relay_event unknown type', [
                    'event_type' => mb_substr($relayEventType, 0, 32),
                    'connection_id' => $connectionId,
                    'payload_keys' => array_slice(array_keys($eventPayload), 0, 10),
                ]);

                return response()->json(['ok' => true, 'message' => 'relay_event_unknown_logged']);
        }
    }

    /** @param array{peer_uid: string, typist_uid: string|null}|null $typing */
    private function broadcastTyping(?string $channelAccountId, ?array $typing): void
    {
        if ($typing === null || $channelAccountId === null) {
            return;
        }

        $conversation = Conversation::where('channel_account_id', $channelAccountId)
            ->where('peer_uid', $typing['peer_uid'])
            ->first();

        if ($conversation !== null) {
            try {
                event(new ConversationTyping($conversation->workspace_id, $conversation->id, $typing['typist_uid']));
            } catch (Throwable $e) {
                // Review LOW-2: ShouldBroadcastNow — Reverb down không được thành 500
                // (typing là phù du, contract chatty luôn 200)
                $this->safeReport($e);
            }
        }
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
