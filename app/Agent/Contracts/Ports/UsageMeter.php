<?php

namespace App\Agent\Contracts\Ports;

use App\Agent\ValueObjects\UsageIncrement;

// Số liệu tổng kết của nhân viên AI, cộng dồn ngay khi phát sinh vào kỳ đang chạy. Ghi
// hỏng không được làm hỏng lượt: hiện thực tự nuốt lỗi và báo log.
interface UsageMeter
{
    public function add(UsageIncrement $increment): void;
}
