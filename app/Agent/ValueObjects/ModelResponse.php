<?php

namespace App\Agent\ValueObjects;

use InvalidArgumentException;

// Phản hồi đã chuẩn hoá. Lỗi nhà cung cấp không ném ra ngoài cổng: trả
// finishReason = Error kèm `error`.
final readonly class ModelResponse
{
    /** @param list<TextBlock|ToolCall|ProviderBlock> $content theo đúng thứ tự mô hình phát */
    public function __construct(
        public array $content,
        public FinishReason $finishReason,
        public Usage $usage,
        public ?ModelRoute $route = null,
        public ?ModelError $error = null,
    ) {
        if (($finishReason === FinishReason::Error) !== ($error !== null)) {
            throw new InvalidArgumentException('An error response must carry exactly one ModelError.');
        }

        foreach ($content as $block) {
            if (! $block instanceof TextBlock && ! $block instanceof ToolCall && ! $block instanceof ProviderBlock) {
                throw new InvalidArgumentException('Response content holds only text blocks, tool calls and provider blocks.');
            }
        }
    }

    public static function failed(ModelError $error, Usage $usage, ?ModelRoute $route = null): self
    {
        return new self([], FinishReason::Error, $usage, $route, $error);
    }

    /** @return list<ToolCall> */
    public function toolCalls(): array
    {
        return array_values(array_filter($this->content, fn ($block) => $block instanceof ToolCall));
    }

    public function text(): string
    {
        $texts = array_map(
            fn (TextBlock $block) => $block->text,
            array_filter($this->content, fn ($block) => $block instanceof TextBlock),
        );

        return implode("\n", $texts);
    }
}
