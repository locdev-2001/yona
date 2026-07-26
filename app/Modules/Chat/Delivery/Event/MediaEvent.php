<?php

namespace App\Modules\Chat\Delivery\Event;

final class MediaEvent extends OutboundEvent
{
    public function __construct(
        public readonly string $url,
        public readonly ?string $mime = null,
        public readonly ?string $caption = null,
    ) {}

    public function type(): OutboundEventType
    {
        return OutboundEventType::Media;
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        return new self(
            url: (string) ($data['url'] ?? ''),
            mime: isset($data['mime']) ? (string) $data['mime'] : null,
            caption: isset($data['caption']) ? (string) $data['caption'] : null,
        );
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return array_filter([
            'type' => $this->type()->value,
            'url' => $this->url,
            'mime' => $this->mime,
            'caption' => $this->caption,
        ], fn ($v) => $v !== null);
    }

    public function plainText(): string
    {
        return $this->caption ?? '';
    }
}
