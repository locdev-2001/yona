<?php

namespace App\Services\Widget;

use App\Models\Conversation;
use App\Models\Message;
use App\Services\Channels\ChannelOutboundActions;

/**
 * Widget không có nền tảng bên ngoài để gọi: biểu cảm, thu hồi của agent chỉ cần ghi
 * lên tin, còn `message.updated` tự tới widget qua realtime. Gõ phím đi đường realtime
 * riêng của widget nên ở đây không làm gì.
 */
final class WidgetOutboundActions implements ChannelOutboundActions
{
    public function reaction(Message $message, ?string $emoji): array
    {
        return ['ok' => true];
    }

    public function recall(Message $message): array
    {
        return ['ok' => true];
    }

    public function typing(Conversation $conversation): void {}
}
