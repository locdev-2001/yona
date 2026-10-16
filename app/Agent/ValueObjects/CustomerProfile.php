<?php

namespace App\Agent\ValueObjects;

// Hồ sơ khách của hội thoại hiện tại như shop đang có. Tên null khi khách chưa khai tên
// thật (tên ẩn danh do hệ thống đặt). Thuộc tính là các trường tuỳ biến shop đã định
// nghĩa cho khách, kèm giá trị hiện có (null = còn trống).
final readonly class CustomerProfile
{
    /**
     * @param  list<array{key: string, label: string, type: string, value: ?string, options: list<string>}>  $attributes
     * @param  list<string>  $labels
     * @param  list<array{at: string, text: string}>  $notes  mới nhất trước
     * @param  list<array{started_at: string, last_activity_at: string, status: string, channel: string, last_lines: list<string>}>  $recentConversations  mới nhất trước
     */
    public function __construct(
        public ?string $name,
        public ?string $phoneNumber,
        public ?string $email,
        public ?string $city,
        public array $attributes,
        public array $labels,
        public array $notes,
        public int $otherConversationCount,
        public array $recentConversations,
    ) {}
}
