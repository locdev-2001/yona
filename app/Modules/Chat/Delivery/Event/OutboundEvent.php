<?php

namespace App\Modules\Chat\Delivery\Event;

/**
 * Một sự kiện nội dung trong tin. Tin là DANH SÁCH sự kiện, không phải một chuỗi.
 *
 * Lớp con mang payload có kiểu; `OutboundEventType` mang danh tính để lưu và
 * truyền đi (§0.6 — luật đối xứng gốc-trừu-tượng ↔ enum).
 *
 * LUẬT: kênh nào render được sự kiện nào là việc của ADAPTER. Lõi đưa nguyên danh
 * sách xuống driver và không bao giờ lọc theo kênh — lọc ở lõi tức là lõi phải
 * biết Zalo làm được gì, đúng thứ luật bất biến #1 cấm.
 */
abstract class OutboundEvent
{
    abstract public function type(): OutboundEventType;

    /** @return array<string, mixed> */
    abstract public function toArray(): array;

    /**
     * Bản chữ thuần của sự kiện, dùng dựng `messages.body` cho xem trước và tìm kiếm.
     *
     * Danh sách hội thoại và tìm kiếm toàn văn đọc `body`, KHÔNG đọc sự kiện —
     * nhờ vậy thêm loại sự kiện mới không đụng tới chỉ mục tìm kiếm nào.
     */
    abstract public function plainText(): string;

    /**
     * Dựng sự kiện từ dữ liệu đã lưu / nhận qua API.
     *
     * Loại lạ KHÔNG bị vứt mà thành `OpaqueEvent`: widget đã nhúng vào website
     * khách không cập nhật kịp khi ta thêm loại mới, và tin cũ phải đọc được sau
     * khi ta đổi bộ sự kiện. Vứt là mất dữ liệu vĩnh viễn.
     *
     * @param  array<string, mixed>  $data
     */
    public static function fromArray(array $data): self
    {
        $type = OutboundEventType::tryFrom((string) ($data['type'] ?? ''));

        return match ($type) {
            OutboundEventType::Text => TextEvent::fromArray($data),
            OutboundEventType::Media => MediaEvent::fromArray($data),
            OutboundEventType::Card => CardEvent::fromArray($data),
            OutboundEventType::Actions => ActionsEvent::fromArray($data),
            OutboundEventType::Input => InputEvent::fromArray($data),
            default => new OpaqueEvent($data),
        };
    }

    /**
     * @param  list<array<string, mixed>>  $items
     * @return list<self>
     */
    public static function listFromArray(array $items): array
    {
        return array_values(array_map(
            fn (array $item) => self::fromArray($item),
            array_filter($items, 'is_array'),
        ));
    }

    /**
     * @param  list<self>  $events
     * @return list<array<string, mixed>>
     */
    public static function listToArray(array $events): array
    {
        return array_map(fn (self $block) => $block->toArray(), $events);
    }

    /**
     * Ghép chữ thuần của cả danh sách — nguồn của `messages.body`.
     *
     * @param  list<self>  $events
     */
    public static function flatten(array $events): string
    {
        $parts = array_filter(array_map(fn (self $block) => trim($block->plainText()), $events));

        return implode("\n", $parts);
    }
}
