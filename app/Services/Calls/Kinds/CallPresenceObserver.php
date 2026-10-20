<?php

namespace App\Services\Calls\Kinds;

use App\Models\Call;

// Module được báo khi người trong phòng hoặc nguồn phát đổi (vào, ra, bật/tắt chia sẻ màn
// hình, phòng đóng), để tự đẩy cập nhật tới những ai cần thấy. Loại nào không cần thì không khai.
interface CallPresenceObserver
{
    public function presenceChanged(Call $call): void;
}
