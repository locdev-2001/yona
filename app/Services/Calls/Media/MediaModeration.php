<?php

namespace App\Services\Calls\Media;

// Vai điều hành phòng từ phía máy chủ (quản trị nhóm). Người bị tắt nguồn vẫn tự bật lại được.
interface MediaModeration
{
    public function mute(string $room, string $identity, MediaSource $source): void;

    public function remove(string $room, string $identity): void;
}
