<?php

namespace App\Messaging\Delivery\Renderers;

use App\Channels\Capability;
use App\Messaging\Delivery\ChoiceToken;
use App\Messaging\Delivery\NativeRenderer;
use App\Messaging\Structured\StructuredType;
use App\Messaging\Structured\Types\QuickRepliesType;
use App\Models\Message;

/** Telegram Bot API: inline_keyboard, callback_data mã hoá `{message_id}:{value|iN}`. */
final class TelegramRenderer implements NativeRenderer
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
        $items = $attributes['items'];

        return [[
            'text' => $message->outgoingContent(),
            'reply_markup' => [
                'one_time_keyboard' => true,
                'inline_keyboard' => array_map(
                    fn (array $item, int $index) => [[
                        'text' => $item['title'],
                        'callback_data' => ChoiceToken::telegram($message->id, $item['value'], $index),
                    ]],
                    $items,
                    array_keys($items),
                ),
            ],
        ]];
    }
}
