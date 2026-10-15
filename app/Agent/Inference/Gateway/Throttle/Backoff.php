<?php

namespace App\Agent\Inference\Gateway\Throttle;

use Closure;

// Giãn cách thử lại: theo lời khuyên của máy chủ nếu có, không thì mũ có trần cộng
// jitter ngẫu nhiên [0, JITTER_RATIO × delay]. Nền nhỏ vì cả lượt chỉ có ~120 giây.
final class Backoff
{
    private const BASE_SECONDS = 1.0;

    private const MAX_SECONDS = 8.0;

    private const JITTER_RATIO = 0.5;

    /** @var Closure(): float trả số trong [0, 1) */
    private readonly Closure $random;

    /** @param (Closure(): float)|null $random */
    public function __construct(?Closure $random = null)
    {
        $this->random = $random ?? fn (): float => mt_rand() / (mt_getrandmax() + 1);
    }

    // `attempt` đếm từ 1 (lần thử lại đầu tiên).
    public function delaySeconds(int $attempt, ?float $serverAdvice = null): float
    {
        if ($serverAdvice !== null) {
            return $serverAdvice;
        }

        $delay = min(self::BASE_SECONDS * (2 ** max(0, $attempt - 1)), self::MAX_SECONDS);

        return $delay + ($this->random)() * self::JITTER_RATIO * $delay;
    }
}
