<?php

namespace App\Messaging\Delivery\Renderers;

use App\Channels\Capability;
use App\Messaging\Delivery\ChoiceToken;
use App\Messaging\Delivery\NativeRenderer;
use App\Messaging\Structured\StructuredType;
use App\Messaging\Structured\Types\QuickRepliesType;
use App\Models\Message;

/** Messenger Send API "Quick Replies": chip trả lời nhanh dưới ô nhập. */
final class FacebookRenderer implements NativeRenderer
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
