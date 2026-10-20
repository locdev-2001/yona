<?php

namespace App\Services\Calls\Media;

// Một nhà cung cấp phòng media gom đủ bốn vai. Thêm nhà cung cấp = thêm một driver và một
// dòng ở config/calls.php, lõi không đổi.
interface MediaDriver
{
    public function rooms(): MediaRooms;

    public function tickets(): MediaTickets;

    public function moderation(): MediaModeration;

    public function webhooks(): MediaWebhooks;
}
