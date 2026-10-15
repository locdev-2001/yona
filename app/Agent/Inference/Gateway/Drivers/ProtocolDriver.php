<?php

namespace App\Agent\Inference\Gateway\Drivers;

use App\Agent\Inference\Gateway\Protocol;
use App\Agent\Inference\Gateway\Route;
use App\Agent\ValueObjects\Prompt;

// Bộ chuyển đổi Prompt trung tính ↔ wire format của một giao thức. Không gọi mạng,
// không phân loại lỗi HTTP: chỉ dựng request và đọc thân phản hồi thành công.
interface ProtocolDriver
{
    public function protocol(): Protocol;

    public function endpoint(Route $route): string;

    /** @return array<string, string> gồm cả header xác thực; không bao giờ ghi lại */
    public function headers(Route $route): array;

    /** @return array<string, mixed> thân request, tất định cho cùng đầu vào */
    public function body(Prompt $prompt, Route $route, string $cacheKey): array;

    /**
     * @param  array<string, mixed>  $body  thân phản hồi HTTP 2xx đã giải JSON
     *
     * @throws ProviderErrorInBody nhà cung cấp báo lỗi trong thân 2xx
     * @throws UnreadableResponse thân không đúng hình dạng của giao thức
     */
    public function parse(array $body): Completion;
}
