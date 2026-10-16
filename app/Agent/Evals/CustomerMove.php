<?php

namespace App\Agent\Evals;

use InvalidArgumentException;

// Bước tiếp theo của khách giả: tin nhắn gửi shop (nếu có) và ý định sau tin đó.
final readonly class CustomerMove
{
    public function __construct(
        public ?string $message,
        public CustomerIntent $intent,
        public string $why = '',
    ) {
        if ($intent === CustomerIntent::Continue && ($message === null || trim($message) === '')) {
            throw new InvalidArgumentException('A customer who continues must write a message.');
        }
    }

    /** @param array<string, mixed> $raw */
    public static function fromJson(array $raw): self
    {
        $intent = CustomerIntent::tryFrom((string) ($raw['end'] ?? ''))
            ?? throw new InvalidArgumentException('`end` must be one of: continue, goal_met, gave_up.');
        $message = trim((string) ($raw['message'] ?? ''));

        return new self($message === '' ? null : $message, $intent, trim((string) ($raw['why'] ?? '')));
    }
}
