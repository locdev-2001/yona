<?php

namespace App\Channels;

use App\Models\Message;

/**
 * Kênh có giao diện web riêng tự khai đường mở một tin ngay tại nền tảng gốc
 * (hộp thư Gmail…). Lõi chỉ hỏi qua contract này, không dựng URL theo loại kênh.
 */
interface LinksMessagesToSource
{
    /** Null khi tin không mở được ở nền tảng gốc (chưa có mã tin, nhà cung cấp không có web). */
    public function sourceMessageUrl(Message $message): ?string;
}
