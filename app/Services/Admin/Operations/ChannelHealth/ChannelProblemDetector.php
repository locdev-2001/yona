<?php

namespace App\Services\Admin\Operations\ChannelHealth;

use App\Models\Inbox;

// Driver dò sức khoẻ của một loại kênh. Lõi chỉ hỏi qua hai hàm này, không
// biết tên kênh nào; đặc thù (trạng thái phiên, mạch ngắt…) nằm trong driver.
interface ChannelProblemDetector
{
    public function supports(Inbox $inbox): bool;

    public function detect(Inbox $inbox): ?ChannelProblem;
}
