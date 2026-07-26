<?php

namespace App\Modules\Chat\Port\Capability;

use App\Models\Conversation;
use App\Models\Message;

/**
 * Kênh thả/gỡ được cảm xúc lên một tin.
 *
 * Lõi hỏi `$driver instanceof SupportsReactions` — không `method_exists`.
 * Driver quên implement thì PHPStan đỏ, không im lặng bỏ qua lúc chạy.
 */
interface SupportsReactions
{
    /**
     * @param  string  $icon  chuỗi rỗng = gỡ cảm xúc
     *
     * @throws \InvalidArgumentException tin thiếu metadata nền tảng bắt buộc
     * @throws \RuntimeException nền tảng từ chối hoặc vượt throttle của kênh
     */
    public function react(Conversation $conversation, Message $message, string $icon): void;
}
