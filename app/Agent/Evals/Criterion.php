<?php

namespace App\Agent\Evals;

use InvalidArgumentException;

// Tiêu chí đạt riêng của một kịch bản, giám khảo chấm đạt hoặc không.
final readonly class Criterion
{
    public function __construct(
        public string $id,
        public string $text,
    ) {
        if (preg_match('/^[a-z0-9][a-z0-9-]{1,63}$/', $id) !== 1 || trim($text) === '') {
            throw new InvalidArgumentException("Criterion `{$id}` needs a kebab-case id and a text.");
        }
    }

    public static function fromArray(mixed $raw, string $scenarioId): self
    {
        if (! is_array($raw)) {
            throw new InvalidArgumentException("Scenario `{$scenarioId}`: every criterion must be an object.");
        }

        try {
            return new self((string) ($raw['id'] ?? ''), trim((string) ($raw['text'] ?? '')));
        } catch (InvalidArgumentException $exception) {
            throw new InvalidArgumentException("Scenario `{$scenarioId}`: {$exception->getMessage()}", previous: $exception);
        }
    }
}
