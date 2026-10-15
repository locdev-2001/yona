<?php

namespace App\Agent\Inference\Gateway;

// Quyết định cache cho một request trên một tuyến; driver chỉ việc render theo.
final readonly class CacheDirectives
{
    public function __construct(
        // Chỉ số khối system mang điểm ngắt; null = không đặt.
        public ?int $systemBreakpoint = null,
        // Chỉ số tin trong Prompt mang điểm ngắt lịch sử; null = không đặt.
        public ?int $historyBreakpoint = null,
        // Khoá định tuyến cache cho nhà cung cấp cache tự động; null = không gửi.
        public ?string $promptCacheKey = null,
    ) {}

    public function usesBreakpoints(): bool
    {
        return $this->systemBreakpoint !== null || $this->historyBreakpoint !== null;
    }
}
