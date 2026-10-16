<?php

namespace App\Agent\Evals;

use DateTimeImmutable;

// Một dòng của bản ghi hội thoại eval, đọc lại từ tin thật trong hộp thư.
final readonly class TranscriptLine
{
    public function __construct(
        public int $messageId,
        public Speaker $speaker,
        public string $text,
        public DateTimeImmutable $at,
    ) {}

    /** @return array{message_id: int, speaker: string, text: string, at: string} */
    public function toArray(): array
    {
        return [
            'message_id' => $this->messageId,
            'speaker' => $this->speaker->value,
            'text' => $this->text,
            'at' => $this->at->format(DATE_ATOM),
        ];
    }

    /** @param array<string, mixed> $raw */
    public static function fromArray(array $raw): self
    {
        return new self(
            (int) ($raw['message_id'] ?? 0),
            Speaker::from((string) ($raw['speaker'] ?? '')),
            (string) ($raw['text'] ?? ''),
            new DateTimeImmutable((string) ($raw['at'] ?? 'now')),
        );
    }
}
