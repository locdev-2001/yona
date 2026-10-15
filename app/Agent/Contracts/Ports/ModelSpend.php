<?php

namespace App\Agent\Contracts\Ports;

use DateTimeImmutable;

// Chi phí gọi mô hình đã ghi (micro-USD) của một account trong khoảng thời gian.
interface ModelSpend
{
    public function costMicroUsd(int $accountId, DateTimeImmutable $from, DateTimeImmutable $until): int;
}
