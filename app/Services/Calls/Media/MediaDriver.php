<?php

namespace App\Services\Calls\Media;

// Một nhà cung cấp phòng media gom đủ bốn vai. Thêm nhà cung cấp = thêm một driver và một
// dòng ở config/calls.php, lõi không đổi.
interface MediaDriver
{
    // Đủ địa chỉ và khoá để gọi được nhà cung cấp; chưa đủ thì giao diện không mở cuộc gọi. Tĩnh
    // để hỏi được mà không dựng cả driver (mỗi lần tải trang).
    public static function isConfigured(): bool;

    public function rooms(): MediaRooms;

    public function tickets(): MediaTickets;

    public function moderation(): MediaModeration;

    public function webhooks(): MediaWebhooks;
}
