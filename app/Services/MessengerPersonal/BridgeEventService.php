<?php

namespace App\Services\MessengerPersonal;

use App\Messaging\Inbound\Events\EditEvent;
use App\Messaging\Inbound\Events\InboundEvent;
use App\Messaging\Inbound\Events\ReactionEvent;
use App\Messaging\Inbound\Events\RecallEvent;
use App\Messaging\Inbound\Events\ReceiptEvent;
use App\Messaging\Inbound\MessageEventService;
use App\Models\Channel\MessengerPersonal;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Services\Conversations\GroupMembersService;
use App\Services\Conversations\TypingStatusManager;
use Illuminate\Support\Facades\Log;

/**
 * Điều phối một sự kiện webhook của sidecar theo `type`: tin đến, thẻ đổi nội dung và nhóm đổi hồ sơ qua InboundMapper,
 * biên nhận/cảm xúc/thu hồi/sửa qua MessageEventService, gõ phím qua ống "đang nhập…"
 * của lõi, trạng thái phiên vào bản ghi kênh.
 */
class BridgeEventService
{
    private const RECEIPT_READ = 'read';

    public function __construct(
        private readonly InboundMapper $inbound,
        private readonly MessageEventService $messageEvents,
        private readonly HealthMonitor $monitor,
        private readonly GroupMembersService $groupMembers,
        private readonly ProfileSync $profiles,
    ) {}

    /** @param array<string, mixed> $payload */
    public function handle(array $payload): void
    {
        $channel = $this->resolveChannel($payload);
        $inbox = $channel?->inbox;

        if ($channel === null || $inbox === null || ! $channel->account->isActive()) {
            return;
        }

        if (! $this->belongsToConnectedAccount($channel, $payload)) {
            return;
        }

        match ((string) ($payload['type'] ?? '')) {
            'inbound' => $this->inbound->write($inbox, $channel, $payload),
            'chat_updated' => $this->inbound->applyChatUpdate($inbox, $payload),
            'card_update' => $this->inbound->applyCardUpdate($inbox, $payload),
            'receipt' => $this->apply($inbox, $this->receiptEvent($payload)),
            'reaction' => $this->apply($inbox, $this->reactionEvent($channel, $payload)),
            'unsend' => $this->apply($inbox, $this->targetOf($payload) === null ? null : new RecallEvent($this->targetOf($payload))),
            'edit' => $this->apply($inbox, $this->targetOf($payload) === null ? null : new EditEvent($this->targetOf($payload), is_string($payload['text'] ?? null) ? $payload['text'] : null)),
            'typing' => $this->typing($inbox, $channel, $payload),
            'session' => $this->session($channel, $payload),
            default => Log::info('messenger_personal.webhook.unhandled_type', ['type' => $payload['type'] ?? null]),
        };
    }

    /** @param array<string, mixed> $payload */
    private function resolveChannel(array $payload): ?MessengerPersonal
    {
        $connectionId = (int) ($payload['connection_id'] ?? 0);

        return $connectionId > 0 ? MessengerPersonal::query()->find($connectionId) : null;
    }

    /**
     * Slot đã đổi sang tài khoản khác thì sự kiện cũ còn trong outbox của sidecar không
     * được đổ vào hộp thư này.
     *
     * @param  array<string, mixed>  $payload
     */
    private function belongsToConnectedAccount(MessengerPersonal $channel, array $payload): bool
    {
        $reported = (string) ($payload['facebook_user_id'] ?? '');

        if ($reported === '' || blank($channel->facebook_user_id) || $reported === $channel->facebook_user_id) {
            return true;
        }

        Log::warning('messenger_personal.webhook.account_mismatch', [
            'connection_id' => $channel->connectionId(),
            'type' => $payload['type'] ?? null,
        ]);

        return false;
    }

    private function apply(Inbox $inbox, ?InboundEvent $event): void
    {
        if ($event !== null) {
            $this->messageEvents->apply($inbox, $event);
        }
    }

    /** @param array<string, mixed> $payload */
    private function receiptEvent(array $payload): ?ReceiptEvent
    {
        $sourceIds = array_values(array_filter(
            array_map(fn ($id) => is_scalar($id) ? (string) $id : '', is_array($payload['source_ids'] ?? null) ? $payload['source_ids'] : []),
            fn (string $id) => $id !== '',
        ));

        if ($sourceIds === []) {
            return null;
        }

        return ($payload['status'] ?? null) === self::RECEIPT_READ ? ReceiptEvent::read($sourceIds) : ReceiptEvent::delivered($sourceIds);
    }

    /** @param array<string, mixed> $payload */
    private function reactionEvent(MessengerPersonal $channel, array $payload): ?ReactionEvent
    {
        $target = $this->targetOf($payload);
        $actor = filled($payload['sender_id'] ?? null) ? (string) $payload['sender_id'] : null;

        if ($target === null || $actor === null) {
            return null;
        }

        $emoji = is_string($payload['emoji'] ?? null) && $payload['emoji'] !== '' ? $payload['emoji'] : null;

        return new ReactionEvent($target, $emoji, $actor, isSelf: $actor === $channel->facebook_user_id);
    }

    /** @param array<string, mixed> $payload */
    private function targetOf(array $payload): ?string
    {
        return filled($payload['target_source_id'] ?? null) ? (string) $payload['target_source_id'] : null;
    }

    /**
     * Sidecar báo cả bật lẫn tắt, nên không cần hẹn giờ tự tắt. Chính chủ tài khoản gõ ở
     * app khác không phải khách đang gõ.
     *
     * @param  array<string, mixed>  $payload
     */
    private function typing(Inbox $inbox, MessengerPersonal $channel, array $payload): void
    {
        $chat = MessengerChat::fromPayload($payload['chat'] ?? null);
        $senderId = (string) ($payload['sender_id'] ?? '');

        if ($chat === null || ($senderId !== '' && $senderId === $channel->facebook_user_id)) {
            return;
        }

        $conversation = $this->conversationOf($inbox, $chat);

        if ($conversation === null || $conversation->contact === null) {
            return;
        }

        // Không tra được người gõ (chưa nhắn gì trong nhóm) thì báo cả nhóm đang gõ, chỉ thiếu tên.
        $groupMember = $chat->isGroup() && $senderId !== '' ? $this->groupMembers->find($conversation, $senderId) : null;
        $status = ($payload['typing'] ?? false) === true ? 'on' : 'off';

        (new TypingStatusManager($conversation, $conversation->contact, ['typing_status' => $status], $groupMember))->toggleTypingStatus();
    }

    /** Không tự tạo hội thoại: gõ mà chưa từng nhắn thì không có gì để hiện. */
    private function conversationOf(Inbox $inbox, MessengerChat $chat): ?Conversation
    {
        $contactInbox = $inbox->contactInboxes()->where('source_id', $chat->id)->first();

        if ($contactInbox === null) {
            return null;
        }

        return $contactInbox->conversations()->where('status', '!=', Conversation::STATUS_RESOLVED)->latest('id')->first()
            ?? $contactInbox->conversations()->latest('id')->first();
    }

    /** @param array<string, mixed> $payload */
    private function session(MessengerPersonal $channel, array $payload): void
    {
        $reported = (string) ($payload['state'] ?? '');
        $reason = is_string($payload['reason'] ?? null) && $payload['reason'] !== '' ? $payload['reason'] : null;

        match ($reported) {
            'connected' => $this->sessionConnected($channel, is_array($payload['account'] ?? null) ? $payload['account'] : []),
            'session_lost' => $channel->markState(MessengerPersonal::STATE_SESSION_LOST, $reason ?? $reported),
            'disconnected' => $channel->state === MessengerPersonal::STATE_DISCONNECTED
                ? null
                : $channel->markState(MessengerPersonal::STATE_DISCONNECTED, $reason ?? $reported),
            default => Log::warning('messenger_personal.webhook.unknown_session_state', [
                'connection_id' => $channel->connectionId(),
                'state' => $reported,
            ]),
        };
    }

    /**
     * Người dùng đã ngắt kết nối mà không có lượt đăng nhập nào đang dở thì `connected`
     * cũ còn trong outbox không được dựng lại phiên.
     */
    /** @param array<string, mixed> $account */
    private function sessionConnected(MessengerPersonal $channel, array $account): void
    {
        if ($channel->state === MessengerPersonal::STATE_DISCONNECTED && blank($channel->login_token)) {
            return;
        }

        $this->monitor->reset($channel->connectionId());
        $channel->markState(MessengerPersonal::STATE_CONNECTED);
        $this->profiles->apply($channel, $account);
    }
}
