<?php

namespace App\Agent\Contracts\Ports;

use App\Agent\ValueObjects\ApiCallRecord;

// Nhật ký gọi API mô hình. Ghi hỏng không được làm hỏng lượt: hiện thực tự nuốt lỗi và báo log.
interface ApiCallLog
{
    public function record(ApiCallRecord $call): void;
}
