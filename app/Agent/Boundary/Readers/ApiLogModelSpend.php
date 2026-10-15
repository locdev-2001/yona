<?php

namespace App\Agent\Boundary\Readers;

use App\Agent\Contracts\Ports\ModelSpend;
use App\Models\ApiLog;
use DateTimeImmutable;

// Chi phí cộng từ nhật ký gọi mô hình (một dòng mỗi lần gọi, kể cả thử lại).
final class ApiLogModelSpend implements ModelSpend
{
    public function costMicroUsd(int $accountId, DateTimeImmutable $from, DateTimeImmutable $until): int
    {
        return (int) ApiLog::query()
            ->where('account_id', $accountId)
            ->where('created_at', '>=', $from)
            ->where('created_at', '<', $until)
            ->sum('cost_micro_usd');
    }
}
