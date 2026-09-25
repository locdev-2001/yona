<?php

namespace App\Messaging\Structured;

use App\Models\AgentBot;
use App\Models\Conversation;
use App\Models\User;

/** Thứ loại tin cần biết khi chuẩn hoá mà payload không tự mang (vd tin gốc của yêu cầu đặt hàng). */
final readonly class PayloadContext
{
    public function __construct(
        public Conversation $conversation,
        public int $messageType,
        // Ai đang gửi tin — null khi build lại payload để hiển thị (không phải
        // lượt gửi thật); loại tin cần kiểm quyền theo người gửi (vd bank_transfer)
        // chỉ áp dụng khi giá trị này khác null.
        public User|AgentBot|null $performedBy = null,
        // Đọc lại payload đã lưu (hiển thị, gửi ra kênh, xem trước) chứ không phải tạo tin:
        // loại tin chụp dữ liệu lúc gửi (vd thẻ chuyển khoản) giữ nguyên bản đã chụp.
        public bool $fromStorage = false,
    ) {}
}
