<?php

namespace App\Messaging\Delivery\Renderers;

use App\Channels\Capability;
use App\Messaging\Delivery\NativeRenderer;
use App\Messaging\Structured\StructuredType;
use App\Messaging\Structured\Types\QuickRepliesType;
use App\Models\Message;

/**
 * LINE Messaging API: flex bubble với nút "message" — bấm nút gửi lại đúng
 * `value` như khách tự gõ (LINE không có postback câm cho luồng này).
 */
final class LineRenderer implements NativeRenderer
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
        $content = $message->outgoingContent();

        $buttons = array_map(fn (array $item) => [
            'type' => 'button',
            'style' => 'link',
            'height' => 'sm',
            'action' => ['type' => 'message', 'label' => $item['title'], 'text' => $item['value']],
        ], $attributes['items']);

        return [[
            'type' => 'flex',
            'altText' => $content,
            'contents' => [
                'type' => 'bubble',
                'body' => [
                    'type' => 'box',
                    'layout' => 'vertical',
                    'contents' => [
                        ['type' => 'text', 'text' => $content, 'wrap' => true],
                        ...$buttons,
                    ],
                ],
            ],
        ]];
    }
}
