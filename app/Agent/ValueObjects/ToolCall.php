<?php

namespace App\Agent\ValueObjects;

use InvalidArgumentException;

final readonly class ToolCall
{
    public const MAX_ID_LENGTH = 64;

    /** @param array<string, mixed> $args */
    public function __construct(
        public string $id,
        public string $name,
        public array $args,
    ) {
        if ($id === '' || mb_strlen($id) > self::MAX_ID_LENGTH) {
            throw new InvalidArgumentException('Tool call id must be 1-64 characters.');
        }

        if ($name === '') {
            throw new InvalidArgumentException('Tool call needs a tool name.');
        }
    }
}
