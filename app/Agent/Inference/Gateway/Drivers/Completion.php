<?php

namespace App\Agent\Inference\Gateway\Drivers;

use App\Agent\ValueObjects\FinishReason;
use App\Agent\ValueObjects\ProviderBlock;
use App\Agent\ValueObjects\TextBlock;
use App\Agent\ValueObjects\ToolCall;
use App\Agent\ValueObjects\Usage;

// Kết quả đọc một phản hồi thành công, trước khi cổng gắn tuyến, chi phí, độ trễ.
final readonly class Completion
{
    /** @param list<TextBlock|ToolCall|ProviderBlock> $content */
    private function __construct(
        public array $content,
        public FinishReason $finishReason,
        public Usage $usage,
    ) {}

    /**
     * Chuẩn hoá lý do dừng chung cho mọi giao thức: bị cắt và từ chối giữ nguyên; có lời
     * gọi công cụ là ToolUse; có chữ là EndTurn; không có gì là Empty.
     *
     * @param  list<TextBlock|ToolCall|ProviderBlock>  $content
     */
    public static function settle(array $content, FinishReason $nativeReason, Usage $usage): self
    {
        $hasToolCall = false;
        $hasText = false;

        foreach ($content as $block) {
            $hasToolCall = $hasToolCall || $block instanceof ToolCall;
            $hasText = $hasText || ($block instanceof TextBlock && trim($block->text) !== '');
        }

        $reason = match (true) {
            in_array($nativeReason, [FinishReason::MaxOutput, FinishReason::Refusal], true) => $nativeReason,
            $hasToolCall => FinishReason::ToolUse,
            $hasText => FinishReason::EndTurn,
            default => FinishReason::Empty,
        };

        return new self($content, $reason, $usage);
    }
}
