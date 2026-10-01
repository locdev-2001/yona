<?php

namespace App\Listeners;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Messaging\Structured\StructuredTypeRegistry;
use App\Models\Message;
use App\Models\User;
use App\Services\Admin\Metrics\ChannelTypes;
use App\Services\ProductEvents\ProductEventName;
use App\Services\ProductEvents\ProductEventRecorder;
use Throwable;

// Sự kiện sản phẩm suy từ tin nhắn: tin vào/ra đầu tiên của account, gửi sticker,
// gửi tin có cấu trúc. Chỉ đọc loại tin và id, không đọc nội dung.
class ProductEventListener extends BaseListener
{
    public function __construct(
        private readonly ProductEventRecorder $recorder,
        private readonly StructuredTypeRegistry $structuredTypes,
        private readonly ChannelTypes $channelTypes,
    ) {}

    public function handle(DomainEvent $event): void
    {
        if ($event->type !== EventType::MESSAGE_CREATED) {
            return;
        }

        try {
            $this->messageCreated($event->data['message']);
        } catch (Throwable $exception) {
            report($exception);
        }
    }

    private function messageCreated(Message $message): void
    {
        if ($message->isIncoming()) {
            $this->recorder->recordOnce(
                ProductEventName::FirstInboundMessage,
                $message->account_id,
                "first_inbound_message:{$message->account_id}",
                fn () => $this->inboxProperties($message),
                occurredAt: $message->created_at,
            );

            return;
        }

        if (! $message->isOutgoing() || $message->private) {
            return;
        }

        $sentByUser = $message->sender_type === (new User)->getMorphClass();
        if ($sentByUser) {
            $this->recorder->recordOnce(
                ProductEventName::FirstOutboundReply,
                $message->account_id,
                "first_outbound_reply:{$message->account_id}",
                fn () => $this->inboxProperties($message),
                $message->sender_id,
                $message->created_at,
            );
        }

        $contentType = $message->contentTypeName();
        $userId = $sentByUser ? $message->sender_id : null;

        if ($contentType === 'sticker') {
            $stickerId = (string) ($message->content_attributes['sticker']['id'] ?? '');
            $this->recorder->record(
                ProductEventName::StickerSent,
                $message->account_id,
                ['source' => str_starts_with($stickerId, 'yona:') ? 'yona' : 'platform', 'inbox_id' => $message->inbox_id],
                $userId,
                $message->created_at,
                "sticker_sent:{$message->id}",
            );
        } elseif (in_array($contentType, $this->structuredTypes->contentTypes(), true)) {
            $this->recorder->record(
                ProductEventName::StructuredMessageSent,
                $message->account_id,
                ['type' => $contentType, 'inbox_id' => $message->inbox_id],
                $userId,
                $message->created_at,
                "structured_message_sent:{$message->id}",
            );
        }
    }

    /** @return array{inbox_id: int, platform: string} */
    private function inboxProperties(Message $message): array
    {
        return [
            'inbox_id' => (int) $message->inbox_id,
            'platform' => $this->channelTypes->platform($message->inbox?->channel_type)->key,
        ];
    }
}
