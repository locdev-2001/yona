<?php

namespace App\Channels;

/**
 * Driver kênh tự khai cách người dùng nối kênh vào Yona và kênh có đang mở cho khách
 * không (vd thiếu client id/secret của app nền tảng thì đóng). Tĩnh vì chưa có kênh
 * nào khi người dùng đứng ở màn chọn kênh.
 */
interface DeclaresConnection
{
    public static function connection(): ChannelConnection;
}
