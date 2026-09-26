<?php

namespace App\Messaging\Delivery\Renderers\Concerns;

use App\Channels\Capability;
use App\Messaging\Delivery\ChoiceToken;
use App\Messaging\Structured\StructuredType;
use App\Messaging\Structured\Types\QuickRepliesType;
use App\Models\Message;

/**
 * Chip trả lời nhanh "quick_replies": Facebook Messenger và Instagram Messaging
 * đều dựng trên nền Meta nên payload gốc giống hệt nhau, chỉ khác endpoint gửi
 * tới. Dùng chung để thêm kênh Meta mới không phải chép lại render().
 */
trait RendersMetaQuickReplies
{
    public function capability(): Capability
    {
        return Capability::OutboundQuickReply;
    }

    public function supports(StructuredType $type): bool
    {
        return $type instanceof QuickRepliesType;
    }

    public function render(Message $message, array $attributes): array
    {
        return [[
            'text' => $message->outgoingContent(),
            'quick_replies' => array_map(fn (array $item) => [
                'content_type' => 'text',
                'title' => $item['title'],
                'payload' => ChoiceToken::facebook($message->id, $item['value']),
            ], $attributes['items']),
        ]];
    }
}
