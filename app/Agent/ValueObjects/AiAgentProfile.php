<?php

namespace App\Agent\ValueObjects;

use InvalidArgumentException;

// Cấu hình một AI agent mà prompt cần: tên shop đặt, persona, chỉ dẫn của shop.
final readonly class AiAgentProfile
{
    public function __construct(
        public int $id,
        public string $name,
        public ?string $persona,
        public ?string $instructions,
    ) {
        if ($id <= 0 || trim($name) === '') {
            throw new InvalidArgumentException('AI agent profile needs an id and a name.');
        }
    }
}
