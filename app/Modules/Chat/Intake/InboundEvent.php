<?php

namespace App\Modules\Chat\Intake;

use Carbon\CarbonInterface;

/**
 * Gốc cho MỌI thứ đi vào từ một kênh.
 *
 * Lớp con mang payload có kiểu; `InboundEventType` mang danh tính để lưu và
 * truyền đi (§0.6 — luật đối xứng gốc-trừu-tượng ↔ enum).
 *
 * Thêm một loại sự kiện = thêm một lớp con + một case enum, rồi adapter nào
 * hiểu thì dịch ra. Nhà cung cấp không có loại đó thì đơn giản là không bao giờ
 * phát ra — KHÔNG cần sửa lõi, không cần cờ bật/tắt.
 *
 * `channelRef` là tham chiếu thô của nền tảng: lõi lưu và chuyển tiếp nguyên
 * khối, KHÔNG bao giờ đọc key bên trong. Cần dữ liệu nền tảng thì đưa xuống
 * driver để driver tự bóc.
 */
abstract class InboundEvent
{
    /** @param array<string, mixed> $channelRef */
    public function __construct(
        public readonly string $channel,
        public readonly ?string $accountId,
        public readonly string $senderUid,
        public readonly ?CarbonInterface $occurredAt = null,
        public readonly array $channelRef = [],
    ) {}

    abstract public function type(): InboundEventType;
}
