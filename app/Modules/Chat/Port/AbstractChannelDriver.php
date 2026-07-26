<?php

namespace App\Modules\Chat\Port;

use App\Modules\Chat\Delivery\Event\OutboundEventType;

/**
 * Xương chung cho mọi phích cắm kênh.
 *
 * Driver mới `extends` là chạy được ngay; chỉ override đúng cái kênh đó thật sự
 * làm được. Mặc định all-false là mặc định AN TOÀN: kênh quên khai năng lực thì
 * FE ẩn nút, chứ không hiện nút rồi lỗi lúc bấm.
 *
 * `connect`/`disconnect` để rỗng vì có kênh không có khái niệm phiên (kênh nội
 * bộ). Driver nào phải override chúng để chạy được thì đó là dấu hiệu abstract
 * này thiếu, không phải driver sai.
 */
abstract class AbstractChannelDriver implements ChannelDriver
{
    public function capabilities(): ChannelCapabilities
    {
        return new ChannelCapabilities;
    }

    /**
     * Sự kiện nội dung kênh này render được NGUYÊN BẢN.
     *
     * Trả về enum chứ không phải `class-string`: FE dùng trực tiếp để bật/tắt
     * nút soạn thảo, `class-string` thì không đưa xuống trình duyệt được.
     *
     * Dùng để GỢI Ý giao diện, KHÔNG phải để lõi lọc: lõi luôn đưa nguyên danh
     * sách sự kiện xuống driver, sự kiện nào không render được thì adapter tự hạ cấp
     * về chữ. Lõi lọc theo kênh là lõi biết tên kênh.
     *
     * Mặc định chỉ chữ — mặc định an toàn nhất: kênh quên khai thì FE ẩn nút
     * chứ không hiện nút rồi khách bấm vào cái không gửi được.
     *
     * @return list<OutboundEventType>
     */
    public function supportedOutboundEvents(): array
    {
        return [OutboundEventType::Text];
    }

    public function connect(string $workspaceId, array $params): void {}

    public function disconnect(string $workspaceId): void {}
}
