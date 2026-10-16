<?php

namespace App\Agent\Evals;

use App\Agent\ValueObjects\Usage;

// Chi phí và số lần gọi mô hình của khách giả + giám khảo trong một lần chạy kịch bản,
// tách khỏi chi phí của AI đang được đo.
final class EvalSpend
{
    private Usage $usage;

    private int $calls = 0;

    public function __construct()
    {
        $this->usage = Usage::zero();
    }

    public function add(Usage $usage): void
    {
        $this->usage = $this->usage->plus($usage);
        $this->calls++;
    }

    public function costMicroUsd(): int
    {
        return $this->usage->costMicroUsd;
    }

    public function calls(): int
    {
        return $this->calls;
    }
}
