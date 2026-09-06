<?php

namespace App\Services\Zalo;

use App\Models\Channel\Zalo;
use App\Models\Inbox;
use Illuminate\Support\Facades\Log;

/**
 * Điều phối một sự kiện webhook của bridge về đúng dịch vụ xử lý. Port từ
 * ZaloPersonalWebhookController của nhánh `main`, bỏ toàn bộ phần bind RLS/
 * TenantScope (bản rewrite phân tách theo `account_id` như Chatwoot, không RLS).
 */
class BridgeEventService
{
    public function __construct(
        private readonly MessageStateService $messageState,
    ) {}

    /** @param array<string, mixed> $payload */
    public function handle(array $payload): void
    {
        $channel = $this->resolveChannel($payload);

        if ($channel === null || $channel->inbox === null || ! $channel->account->isActive()) {
            return;
        }

        match ($payload['type'] ?? 'inbound') {
            'inbound' => $this->handleInbound($channel->inbox, $payload),
            'bridge_session' => $this->handleSession($channel, $payload),
            'relay_event' => $this->handleRelayEvent($channel->inbox, $payload),
            default => null,
        };
    }

    /** @param array<string, mixed> $payload */
    private function resolveChannel(array $payload): ?Zalo
    {
        $connectionId = (int) ($payload['connection_id'] ?? 0);

        return $connectionId > 0 ? Zalo::query()->find($connectionId) : null;
    }

    /** @param array<string, mixed> $payload */
    private function handleInbound(Inbox $inbox, array $payload): void
    {
        (new IncomingMessageService($inbox, $payload))->perform();
    }

    /** @param array<string, mixed> $payload */
    private function handleSession(Zalo $channel, array $payload): void
    {
        $state = match ($payload['state'] ?? '') {
            'session_ok' => Zalo::STATE_CONNECTED,
            'session_lost' => Zalo::STATE_SESSION_LOST,
            default => null,
        };

        if ($state === null) {
            return;
        }

        $channel->markState($state, $payload['detail'] ?? null);
    }

    /** @param array<string, mixed> $payload */
    private function handleRelayEvent(Inbox $inbox, array $payload): void
    {
        $eventType = (string) ($payload['event_type'] ?? '');
        $eventPayload = is_array($payload['payload'] ?? null) ? $payload['payload'] : [];

        match ($eventType) {
            'undo' => $this->messageState->applyRecall($inbox, $eventPayload),
            'reaction', 'old_reactions' => $this->messageState->applyReaction($inbox, $eventPayload),
            'seen_messages' => $this->messageState->applyReceipts($inbox, $this->receiptIds($eventPayload), 'seen'),
            'delivered_messages' => $this->messageState->applyReceipts($inbox, $this->receiptIds($eventPayload), 'delivered'),
            // typing/connected/upload_attachment là phù du — không có đích lưu.
            'typing', 'connected', 'disconnected', 'upload_attachment' => null,
            default => Log::info('[ZALO] relay_event chưa có xử lý', ['event_type' => $eventType]),
        };
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return list<string>
     */
    private function receiptIds(array $payload): array
    {
        $ids = $payload['msgIds'] ?? $payload['source_ids'] ?? ($payload['msgId'] ?? null);

        return array_values(array_map('strval', array_filter((array) $ids)));
    }
}
