<?php

namespace App\Agent\ValueObjects;

use InvalidArgumentException;

final readonly class PromptMessage
{
    /** @param list<TextBlock|ToolCall|ToolResultBlock> $content theo đúng thứ tự phát */
    public function __construct(
        public MessageRole $role,
        public array $content,
    ) {
        if ($content === []) {
            throw new InvalidArgumentException('Prompt message must have content.');
        }

        foreach ($content as $block) {
            $allowed = $role === MessageRole::Assistant
                ? $block instanceof TextBlock || $block instanceof ToolCall
                : $block instanceof TextBlock || $block instanceof ToolResultBlock;

            if (! $allowed) {
                throw new InvalidArgumentException("Block not allowed in a {$role->value} message.");
            }
        }
    }
}
