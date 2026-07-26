<?php

namespace App\Http\Controllers\Integration;

use App\Events\ConversationTyping;
use App\Http\Middleware\VerifyZaloBridgeSecret;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Workspace;
use App\Models\ZaloConnection;
use App\Modules\Chat\Intake\IntakeService;
use App\Modules\Chat\Port\ChannelRegistry;
use App\Modules\Chat\Status\MessageStatusService;
use App\Modules\Chat\Store\SystemLineService;
use App\Modules\Integration\Chat\ZaloPersonal\ZaloStateEventParser;
use App\Services\ZaloBackfillService;
use App\Support\Activity\ActivityLogger;
use App\Support\TenantScope;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
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
 *   - inbound        → parse + ingest (IntakeService, always-accept F13/F20)
 *   - bridge_session → update ZaloConnection.state
 *   - social_event   → log/no-op (YAGNI)
 *   - relay_event    → P02: undo/seen/delivered/reaction ĐI THEO messages
 *                      (MessageStatusService); typing broadcast-only; lạ → log redacted.
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
    // Internal-first: ChannelRegistry (app/Modules/Integration/) resolve lazily trong
    // handleInbound — KHÔNG inject qua constructor để route:list không fatal khi xóa Integration.
    public function __construct(
        private readonly IntakeService $inboundMessageService,
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
                // P02/P09: relay_event + type LẠ → message-state pipeline / structured
                // log — KHÔNG kho, KHÔNG drop im lặng, KHÔNG metering (F1/F14).
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

            $driver = app(ChannelRegistry::class)->driver('zalo_personal');
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
                app(ZaloBackfillService::class)->run($connectionId);
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
        $stateService = app(MessageStatusService::class);

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
                $this->logUnknownRelayEvent($relayEventType, $connectionId, $channelAccountId, $eventPayload);

                return response()->json(['ok' => true, 'message' => 'relay_event_unknown_logged']);
        }
    }

    /**
     * P09 — observability tối thiểu cho event LẠ (bù việc bỏ kho relay_events):
     * structured log redacted (hash + size + keys, KHÔNG payload thô/nội dung tin),
     * sample ~1 log/phút/(connection, event_type) chống log-spam từ event chatty lạ,
     * alert (error level) khi unknown >10/phút/connection — dấu hiệu zca version
     * mới bắn event chưa có handler.
     *
     * @param  array<int|string, mixed>  $eventPayload
     */
    private function logUnknownRelayEvent(string $eventType, int $connectionId, ?string $channelAccountId, array $eventPayload): void
    {
        $encoded = (string) json_encode($eventPayload);

        if (RateLimiter::attempt('unknown-relay:'.$connectionId.':'.$eventType, 1, fn () => true, 60)) {
            logger()->warning('zalo relay_event unknown type', [
                'event_type' => mb_substr($eventType, 0, 32),
                'connection_id' => $connectionId,
                'channel_account_id' => $channelAccountId,
                'workspace_id' => currentWorkspace()?->id,
                'payload_hash' => sha1($encoded),
                'payload_size' => strlen($encoded),
                'payload_keys' => array_slice(array_keys($eventPayload), 0, 10),
            ]);
        }

        $floodKey = 'unknown-relay-flood:'.$connectionId;
        Cache::add($floodKey, 0, 60);
        $count = (int) Cache::increment($floodKey);
        if ($count === 11) { // alert đúng 1 lần khi vượt ngưỡng trong cửa sổ 60s
            logger()->error('zalo relay_event unknown FLOOD (>10/min) — zca version mới bắn event chưa handler?', [
                'connection_id' => $connectionId,
                'channel_account_id' => $channelAccountId,
                'last_event_type' => mb_substr($eventType, 0, 32),
            ]);
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
     * P08 — social_event hết no-op: group_event/friend_event whitelist → dòng
     * hệ thống conversation_events (taxonomy loại 3, SystemLineService).
     * Act ngoài whitelist / không map được conversation → 200 êm (không kho).
     * Shape: GroupEvent {type: string, act, threadId=groupId, data} ·
     * FriendEvent {type: number, threadId=uid người kia} — zca models.
     *
     * @param  array<string, mixed>  $payload
     */
    private function handleSocialEvent(array $payload): JsonResponse
    {
        $connectionId = (int) ($payload['connection_id'] ?? 0);
        $channelAccountId = $connectionId > 0
            ? ZaloConnection::channelAccountIdForConnection($connectionId)
            : null;
        $threadId = (string) ($payload['thread_id'] ?? '');
        $dedupKey = (string) ($payload['source_id'] ?? '');
        $event = is_array($payload['event'] ?? null) ? $payload['event'] : [];

        if ($channelAccountId === null || $threadId === '' || $dedupKey === '') {
            return response()->json(['ok' => true, 'message' => 'social_event_skipped']);
        }

        $line = match ($payload['social_kind'] ?? '') {
            'group_event' => $this->groupSystemLine($event),
            'friend_event' => $this->friendSystemLine($event),
            default => null,
        };

        if ($line === null) {
            return response()->json(['ok' => true, 'message' => 'social_event_ignored']);
        }

        $conversation = Conversation::where('channel_account_id', $channelAccountId)
            ->where('peer_uid', $threadId)
            ->first();

        if ($conversation === null) {
            // Nhóm/peer chưa từng nhắn — không có thread để hiện dòng, bỏ qua êm
            return response()->json(['ok' => true, 'message' => 'social_event_no_conversation']);
        }

        try {
            app(SystemLineService::class)->materialize(
                $conversation,
                $line['kind'],
                $dedupKey,
                $line['payload'],
            );
        } catch (QueryException|\PDOException $e) {
            $this->safeReport($e);

            return response()->json(['ok' => false, 'message' => 'transient_db_error'], 503);
        }

        // Friend accept = tín hiệu CDP — ghi activity lên contact nếu đã có hồ sơ
        if ($line['kind'] === 'friend_system' && ($line['payload']['act'] ?? '') === 'friend_accepted' && $conversation->contact_id !== null) {
            try {
                $contact = Contact::find($conversation->contact_id);
                if ($contact !== null) {
                    app(ActivityLogger::class)
                        ->log($contact, 'contact.friend_accepted', ['conversation_id' => $conversation->id]);
                }
            } catch (Throwable $e) {
                $this->safeReport($e);
            }
        }

        return response()->json(['ok' => true, 'message' => 'social_event_materialized']);
    }

    /**
     * Whitelist act nhóm (GroupEventType string) → label tiếng Việt.
     *
     * @param  array<string, mixed>  $event
     * @return array{kind: string, payload: array<string, mixed>}|null
     */
    private function groupSystemLine(array $event): ?array
    {
        $type = (string) ($event['type'] ?? '');
        $data = is_array($event['data'] ?? null) ? $event['data'] : [];
        $memberNames = collect($data['updateMembers'] ?? [])
            ->pluck('dName')
            ->filter()
            ->take(5)
            ->implode(', ');

        $label = match ($type) {
            'update' => 'Nhóm cập nhật thông tin'.(! empty($data['groupName']) ? ': '.$data['groupName'] : ''),
            'update_avatar' => 'Nhóm đổi ảnh đại diện',
            'join' => ($memberNames !== '' ? $memberNames : 'Thành viên mới').' đã tham gia nhóm',
            'leave' => ($memberNames !== '' ? $memberNames : 'Một thành viên').' đã rời nhóm',
            'remove_member' => ($memberNames !== '' ? $memberNames : 'Một thành viên').' bị mời khỏi nhóm',
            default => null, // ngoài whitelist — bỏ qua êm, không parse mù
        };

        return $label === null ? null : [
            'kind' => 'group_system',
            'payload' => ['act' => $type, 'label' => $label],
        ];
    }

    /**
     * FriendEventType (number): 0=ADD (thành bạn bè), 2=REQUEST (gửi lời mời).
     *
     * @param  array<string, mixed>  $event
     * @return array{kind: string, payload: array<string, mixed>}|null
     */
    private function friendSystemLine(array $event): ?array
    {
        return match ((int) ($event['type'] ?? -1)) {
            0 => ['kind' => 'friend_system', 'payload' => ['act' => 'friend_accepted', 'label' => 'Hai bên đã trở thành bạn bè trên Zalo']],
            2 => ['kind' => 'friend_system', 'payload' => ['act' => 'friend_request', 'label' => 'Đã gửi lời mời kết bạn']],
            default => null,
        };
    }
}
