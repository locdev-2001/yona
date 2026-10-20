<?php

namespace App\Services\Calls\Media;

// Vai quản lý vòng đời phòng phía nhà cung cấp.
interface MediaRooms
{
    // Mở phòng; phòng đã mở thì giữ nguyên (gọi lại an toàn).
    public function open(RoomSpec $spec): void;

    // Định danh những người đang kết nối trong phòng; phòng chưa mở thì rỗng.
    /** @return list<string> */
    public function participantIdentities(string $room): array;

    // Đóng phòng và ngắt mọi người; phòng không còn thì bỏ qua.
    public function close(string $room): void;
}
