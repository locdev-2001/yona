<?php

namespace App\Modules\Chat\Delivery\Event;

final class TextEvent extends OutboundEvent
{
    public function __construct(public readonly string $text) {}

    public function type(): OutboundEventType
    {
        return OutboundEventType::Text;
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        return new self((string) ($data['text'] ?? ''));
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return ['type' => $this->type()->value, 'text' => $this->text];
    }

    public function plainText(): string
    {
        return $this->text;
    }
}
