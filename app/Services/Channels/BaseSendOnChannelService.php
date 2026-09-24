<?php

namespace App\Services\Channels;

use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;

/**
 * Khung chung cho mọi driver gửi tin ra kênh ngoài. Driver mới chỉ cần khai `channelClass()`
 * và `performReply()`; lõi (SendReplyJob) không biết kênh nào gửi bằng cách gì.
 */
abstract class BaseSendOnChannelService
{
    public function __construct(protected readonly Message $message) {}

    public function perform(): void
    {
        $this->validateTargetChannel();

        if (! $this->isOutgoingMessage() || $this->isInvalidMessage()) {
            return;
        }

        $this->performReply();
    }

    /** @return class-string */
    abstract protected function channelClass(): string;

    abstract protected function performReply(): void;

    protected function conversation(): Conversation
    {
        return $this->message->conversation;
    }

    protected function inbox(): Inbox
    {
        return $this->conversation()->inbox;
    }

    protected function channel(): object
    {
        return $this->inbox()->channel;
    }

    protected function contact(): Contact
    {
        return $this->conversation()->contact;
    }

    protected function sourceId(): ?string
    {
        return $this->conversation()->contactInbox?->source_id;
    }

    // Tin do chính kênh đẩy về (echo) đã mang source_id — gửi lại sẽ thành vòng lặp.
    protected function isOutgoingMessageFromChannel(): bool
    {
        return filled($this->message->source_id);
    }

    protected function isOutgoingMessage(): bool
    {
        return in_array($this->message->message_type, [Message::TYPE_OUTGOING, Message::TYPE_TEMPLATE], true);
    }

    protected function isInvalidMessage(): bool
    {
        return $this->message->private
            || $this->isOutgoingMessageFromChannel()
            || $this->message->contentTypeName() === 'voice_call';
    }

    private function validateTargetChannel(): void
    {
        if ($this->inbox()->channel::class !== $this->channelClass()) {
            throw new \RuntimeException('Invalid channel service was called');
        }
    }
}
