<?php

namespace App\Modules\Chat\Delivery\Event;

/**
 * Một nút bấm / chip trong tin.
 *
 * `id` là thứ quay lại ta khi khách bấm, nên nó là hợp đồng — người gửi tin đặt
 * `id` rồi dựa vào đó để hiểu phản hồi. `label` chỉ để hiển thị, đổi tự do.
 */
final readonly class Action
{
    public function __construct(
        public string $id,
        public string $label,
        public ?string $style = null,
        public ?string $value = null,
    ) {}

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        return new self(
            id: (string) ($data['id'] ?? ''),
            label: (string) ($data['label'] ?? ''),
            style: isset($data['style']) ? (string) $data['style'] : null,
            value: isset($data['value']) ? (string) $data['value'] : null,
        );
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return array_filter([
            'id' => $this->id,
            'label' => $this->label,
            'style' => $this->style,
            'value' => $this->value,
        ], fn ($v) => $v !== null);
    }
}
