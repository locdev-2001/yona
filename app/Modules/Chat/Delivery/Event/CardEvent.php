<?php

namespace App\Modules\Chat\Delivery\Event;

final class CardEvent extends OutboundEvent
{
    /** @param list<Action> $actions */
    public function __construct(
        public readonly string $title,
        public readonly ?string $subtitle = null,
        public readonly ?string $imageUrl = null,
        public readonly array $actions = [],
    ) {}

    public function type(): OutboundEventType
    {
        return OutboundEventType::Card;
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        $actions = array_filter((array) ($data['actions'] ?? []), 'is_array');

        return new self(
            title: (string) ($data['title'] ?? ''),
            subtitle: isset($data['subtitle']) ? (string) $data['subtitle'] : null,
            imageUrl: isset($data['image_url']) ? (string) $data['image_url'] : null,
            actions: array_values(array_map(Action::fromArray(...), $actions)),
        );
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return array_filter([
            'type' => $this->type()->value,
            'title' => $this->title,
            'subtitle' => $this->subtitle,
            'image_url' => $this->imageUrl,
            'actions' => $this->actions === []
                ? null
                : array_map(fn (Action $a) => $a->toArray(), $this->actions),
        ], fn ($v) => $v !== null);
    }

    public function plainText(): string
    {
        return trim($this->title.($this->subtitle !== null ? ' — '.$this->subtitle : ''));
    }
}
