<?php

namespace App\Channels;

/**
 * Kênh gắn với một tài khoản cá nhân (Zalo, Messenger…): tên hộp thư mặc định là tên
 * tài khoản đó. Lõi hỏi tên qua đây, quy tắc đặt/đổi tên nằm ở `InboxNaming`.
 */
interface NamesInboxAfterAccount
{
    /** Tên hiển thị của tài khoản đã đăng nhập; null khi chưa đăng nhập. */
    public function accountDisplayName(): ?string;
}
