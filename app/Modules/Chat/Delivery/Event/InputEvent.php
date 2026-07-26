<?php

namespace App\Modules\Chat\Delivery\Event;

/**
 * Hỏi thông tin ngay trong luồng chat (tên, SĐT, email…).
 *
 * Đặt trong luồng chứ không phải form chặn trước khi chat: khách trả lời được
 * bao nhiêu thì ta biết bấy nhiêu, không mất người ngại để lại số ngay từ đầu.
 */
final class InputEvent extends OutboundEvent
{
    /** @param list<array<string, mixed>> $fields */
    public function __construct(
        public readonly array $fields,
        public readonly ?string $submitLabel = null,
    ) {}

    public function type(): OutboundEventType
    {
        return OutboundEventType::Input;
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        return new self(
            fields: array_values(array_filter((array) ($data['fields'] ?? []), 'is_array')),
            submitLabel: isset($data['submit_label']) ? (string) $data['submit_label'] : null,
        );
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return array_filter([
            'type' => $this->type()->value,
            'fields' => $this->fields,
            'submit_label' => $this->submitLabel,
        ], fn ($v) => $v !== null);
    }

    public function plainText(): string
    {
        $labels = array_filter(array_map(fn (array $f) => $f['label'] ?? null, $this->fields));

        return implode(', ', $labels);
    }
}
