<?php

namespace App\Modules\Chat\Delivery\Event;

/**
 * Hàng nút bấm / chip gợi ý gắn vào một tin.
 *
 * Khác với chip gợi ý tĩnh cấu hình trên tài khoản kênh: sự kiện này thuộc về MỘT
 * tin cụ thể, do người gửi (hoặc sau này là harness AI) đặt vào câu trả lời.
 */
final class ActionsEvent extends OutboundEvent
{
    /** @param list<Action> $actions */
    public function __construct(public readonly array $actions) {}

    public function type(): OutboundEventType
    {
        return OutboundEventType::Actions;
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        $actions = array_filter((array) ($data['actions'] ?? []), 'is_array');

        return new self(array_values(array_map(Action::fromArray(...), $actions)));
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'type' => $this->type()->value,
            'actions' => array_map(fn (Action $a) => $a->toArray(), $this->actions),
        ];
    }

    public function plainText(): string
    {
        return implode(' · ', array_map(fn (Action $a) => $a->label, $this->actions));
    }
}
