<?php

namespace App\Agent\Inference\Gateway;

// Cách nhà cung cấp cache tiền tố prompt.
enum CacheMode: string
{
    // Điểm ngắt `cache_control` đặt tường minh (Messages API).
    case Explicit = 'explicit';
    // Cache tự động theo tiền tố, nhận `prompt_cache_key` để định tuyến.
    case Automatic = 'automatic';
    // Cổng trung gian: mô hình Anthropic nhận `cache_control`, mô hình khác cache tự động.
    case Passthrough = 'passthrough';
    // API tương thích chưa rõ tham số cache: chỉ giữ tiền tố ổn định từng byte.
    case PrefixOnly = 'prefix_only';
}
