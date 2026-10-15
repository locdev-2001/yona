<?php

namespace App\Agent\Inference\Gateway\Drivers;

use App\Agent\ValueObjects\MessageRole;
use App\Agent\ValueObjects\PromptMessage;
use App\Agent\ValueObjects\TextBlock;
use App\Agent\ValueObjects\ToolCall;
use App\Agent\ValueObjects\ToolResultBlock;

// Thứ tự khối gửi lên wire, chung mọi giao thức: kết quả công cụ đứng trước chữ trong
// tin user (giữ nguyên thứ tự tương đối), khối chữ rỗng bị bỏ vì nhà cung cấp từ chối.
final class MessageBlocks
{
    /** @return list<TextBlock|ToolCall|ToolResultBlock> */
    public static function inWireOrder(PromptMessage $message): array
    {
        $blocks = array_values(array_filter(
            $message->content,
            fn ($block) => ! $block instanceof TextBlock || $block->text !== '',
        ));

        if ($message->role !== MessageRole::User) {
            return $blocks;
        }

        $results = array_filter($blocks, fn ($block) => $block instanceof ToolResultBlock);
        $others = array_filter($blocks, fn ($block) => ! $block instanceof ToolResultBlock);

        return [...array_values($results), ...array_values($others)];
    }
}
