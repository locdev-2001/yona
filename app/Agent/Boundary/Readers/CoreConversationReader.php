<?php

namespace App\Agent\Boundary\Readers;

use App\Agent\Boundary\CoreRecords;
use App\Agent\Contracts\Ports\ConversationReader;
use App\Agent\ValueObjects\ConversationRef;
use App\Agent\ValueObjects\ConversationSnapshot;
use App\Agent\ValueObjects\CoreMessage;
use App\Agent\ValueObjects\MessageOrigin;
use App\Models\AgentBot;
use App\Models\AiAgent;
use App\Models\Attachment;
use App\Models\Message;
use App\Models\User;
use App\Services\Channels\ChannelActionRegistry;
use DateTimeImmutable;
use Illuminate\Support\Str;

// Đọc hội thoại và tin của lõi thành ảnh chụp trung tính. Mọi truy vấn khoá theo
// account_id của ConversationRef: hội thoại account khác coi như không tồn tại.
final class CoreConversationReader implements ConversationReader
{
    private const TEXT_CONTENT_TYPE = 'text';

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
            channel: Str::snake(Str::afterLast((string) $inbox->channel_type, ':')),
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

        return $messages->map(fn (Message $message) => $this->snapshot($message))->values()->all();
    }

    private function snapshot(Message $message): CoreMessage
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
            text: blank($message->content) ? null : (string) $message->content,
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
