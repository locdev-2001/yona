<?php

namespace App\Services\Calls;

// Kiểu lúc bắt đầu cuộc gọi. Trong phòng ai cũng bật/tắt mic, camera tuỳ quyền của mình.
enum CallMedia: string
{
    case Audio = 'audio';
    case Video = 'video';
}
