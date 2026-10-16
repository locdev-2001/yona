<?php

namespace App\Agent\Evals;

use InvalidArgumentException;

// Một tin có sẵn trong hội thoại trước lần khách nhắn của kịch bản (khách quay lại sau
// vài ngày): ai nói, nói gì, cách đây bao nhiêu ngày.
final readonly class HistoryLine
{
    public const SPEAKERS = ['customer', 'staff'];

    public function __construct(
        public string $speaker,
        public string $text,
        public int $daysAgo,
        public int $minutesAfter = 0,
    ) {
        if (! in_array($speaker, self::SPEAKERS, true)) {
            throw new InvalidArgumentException('History speaker must be one of: '.implode(', ', self::SPEAKERS).'.');
        }

        if (trim($text) === '' || $daysAgo < 0 || $minutesAfter < 0) {
            throw new InvalidArgumentException('History line needs text, days_ago >= 0 and minutes_after >= 0.');
        }
    }

    public static function fromArray(mixed $raw, string $scenarioId): self
    {
        if (! is_array($raw)) {
            throw new InvalidArgumentException("Scenario `{$scenarioId}`: every history line must be an object.");
        }

        try {
            return new self(
                (string) ($raw['speaker'] ?? ''),
                trim((string) ($raw['text'] ?? '')),
                (int) ($raw['days_ago'] ?? -1),
                (int) ($raw['minutes_after'] ?? 0),
            );
        } catch (InvalidArgumentException $exception) {
            throw new InvalidArgumentException("Scenario `{$scenarioId}`: {$exception->getMessage()}", previous: $exception);
        }
    }
}
