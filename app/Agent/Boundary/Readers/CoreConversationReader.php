<?php

namespace App\Agent\Boundary\Readers;

use App\Agent\Boundary\CoreProducts;
use App\Agent\Boundary\CoreRecords;
use App\Agent\Contracts\Ports\ConversationReader;
use App\Agent\ValueObjects\ConversationRef;
use App\Agent\ValueObjects\ConversationSnapshot;
use App\Agent\ValueObjects\CoreMessage;
use App\Agent\ValueObjects\MessageOrigin;
use App\Channels\Capability;
use App\Models\AgentBot;
use App\Models\AiAgent;
use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Label;
use App\Models\Message;
use App\Models\PaymentAccount;
use App\Models\User;
use App\Services\Channels\ChannelActionRegistry;
use DateTimeImmutable;

// Đọc hội thoại và tin của lõi thành ảnh chụp trung tính. Mọi truy vấn khoá theo
// account_id của ConversationRef: hội thoại account khác coi như không tồn tại.
final class CoreConversationReader implements ConversationReader
{
    private const TEXT_CONTENT_TYPE = 'text';

    private const BANK_TRANSFER_CONTENT_TYPE = 'bank_transfer';

    public function __construct(private readonly MessageText $messageText) {}

    public function conversation(ConversationRef $conversation): ?ConversationSnapshot
    {
        $model = CoreRecords::conversation($conversation);

        if ($model === null) {
            return null;
        }

        $inbox = $model->inbox;
        $replyingAiAgentId = $model->ai_auto_reply ? $inbox->replyingAiAgent()->value('id') : null;
        $heldUntil = $model->floorHeldUntil();

        return new ConversationSnapshot(
            ref: $conversation,
            inboxId: $model->inbox_id,
            contactId: $model->contact_id,
            assigneeUserId: $model->assignee_id,
            aiAgentId: $replyingAiAgentId === null ? null : (int) $replyingAiAgentId,
            floorHeldUntil: $heldUntil === null ? null : DateTimeImmutable::createFromInterface($heldUntil),
            canReply: $model->canReply(),
            isGroup: ChannelActionRegistry::groupMembersFor($inbox)?->isGroup($model) ?? false,
            timezone: (string) ($inbox->timezone ?: config('app.timezone')),
            channel: CoreRecords::channel($inbox),
            accountActive: $model->account->isActive(),
        );
    }

    public function messagesAfter(ConversationRef $conversation, ?int $afterMessageId, int $limit): array
    {
        $model = CoreRecords::conversation($conversation);

        if ($model === null || $limit <= 0) {
            return [];
        }

        $messages = $afterMessageId === null
            ? $model->messagesNewestFirst()->with(['sender', 'attachments'])->limit($limit)->get()->reverse()
            : $model->messages()->with(['sender', 'attachments'])->where('id', '>', $afterMessageId)->limit($limit)->get();

        return $messages->map(fn (Message $message) => $this->snapshot($message, $model))->values()->all();
    }

    public function shownProducts(ConversationRef $conversation, array $productIds): array
    {
        $model = CoreRecords::conversation($conversation);
        $products = CoreProducts::find($conversation->accountId, $productIds);

        if ($model === null || $products === []) {
            return [];
        }

        $sentItems = $model->messages()
            ->where('content_type', Message::CONTENT_TYPES[CoreProducts::CARDS_CONTENT_TYPE])
            ->whereIn('message_type', [Message::TYPE_OUTGOING, Message::TYPE_TEMPLATE])
            ->where('private', false)
            ->get(['id', 'content_attributes'])
            ->flatMap(fn (Message $message) => (array) ($message->content_attributes['items'] ?? []))
            ->filter(fn (mixed $item) => is_array($item));

        return array_values(array_keys(array_filter($products, fn (array $product) => $sentItems->contains(
            // Thẻ gửi cùng thẻ trùng id có thể mang hậu tố `-n`; tên phải trùng.
            fn (array $sent) => ($sent['title'] ?? null) === $product['item']['title']
                && (($sent['id'] ?? null) === $product['item']['id'] || str_starts_with((string) ($sent['id'] ?? ''), $product['item']['id'].'-')),
        ))));
    }

    public function paymentNumbersRequiringCard(ConversationRef $conversation): array
    {
        $model = CoreRecords::conversation($conversation);

        if ($model === null || ! $model->inbox->capabilities()->has(Capability::OutboundCard)) {
            return [];
        }

        $cardSent = $model->messages()
            ->where('content_type', Message::CONTENT_TYPES[self::BANK_TRANSFER_CONTENT_TYPE])
            ->whereIn('message_type', [Message::TYPE_OUTGOING, Message::TYPE_TEMPLATE])
            ->where('private', false)
            ->exists();

        if ($cardSent) {
            return [];
        }

        return PaymentAccount::query()
            ->where('account_id', $conversation->accountId)
            ->where('allow_all_agents', true)
            ->pluck('account_number')
            ->map(fn (mixed $number) => (string) preg_replace('/\D/', '', (string) $number))
            ->filter(fn (string $digits) => $digits !== '')
            ->unique()
            ->values()
            ->all();
    }

    public function labels(int $accountId): array
    {
        return Label::query()->where('account_id', $accountId)->pluck('title')->all();
    }

    private function snapshot(Message $message, Conversation $conversation): CoreMessage
    {
        $sender = $message->sender;
        $attachmentTypes = $message->attachments->map(fn (Attachment $attachment) => $attachment->fileTypeName())->all();
        $contentType = $message->contentTypeName();

        if ($contentType !== self::TEXT_CONTENT_TYPE) {
            array_unshift($attachmentTypes, $contentType);
        }

        return new CoreMessage(
            id: $message->id,
            origin: $this->origin($message),
            text: $this->messageText->of($message, $conversation),
            private: (bool) $message->private,
            createdAt: DateTimeImmutable::createFromInterface($message->created_at),
            senderUserId: $sender instanceof User ? $sender->id : null,
            senderAiAgentId: $sender instanceof AiAgent ? $sender->id : null,
            attachmentTypes: array_values(array_unique($attachmentTypes)),
            senderName: $sender instanceof User || $sender instanceof AiAgent || $sender instanceof AgentBot ? (string) $sender->name : null,
        );
    }

    // Suy từ trường máy chủ sở hữu (loại tin, người gửi, dấu echo/automation), không từ nội dung.
    private function origin(Message $message): MessageOrigin
    {
        $attributes = $message->content_attributes ?? [];

        return match (true) {
            $message->isIncoming() => MessageOrigin::Customer,
            $message->message_type === Message::TYPE_ACTIVITY => MessageOrigin::System,
            $message->sender instanceof AiAgent => MessageOrigin::AiAgent,
            filled($attributes['external_echo'] ?? null) => MessageOrigin::ChannelEcho,
            $message->sender instanceof User
                && blank($attributes['automation_rule_id'] ?? null)
                && blank($message->additional_attributes['campaign_id'] ?? null) => MessageOrigin::Staff,
            default => MessageOrigin::Automation,
        };
    }
}
