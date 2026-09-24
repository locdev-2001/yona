<?php

namespace App\Services\Analytics;

use Illuminate\Http\Client\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

// Chỗ duy nhất phía máy chủ biết giao thức của Plausible: đường dẫn sự kiện,
// header IP khách, header báo sự kiện bị loại, cách cache script.
class PlausibleProxy
{
    public const EVENT_BODY_MAX_BYTES = 8192;

    // Plausible trả header này khi loại sự kiện (bot, IP máy chủ…) dù vẫn 202.
    public const DROPPED_HEADER = 'x-plausible-dropped';

    private const UPSTREAM_EVENT_PATH = '/api/event';

    private const SCRIPT_CACHE_KEY_PREFIX = 'analytics:plausible:script:';

    // Không có header này, Plausible lấy IP từ CF-Connecting-IP/X-Forwarded-For mà
    // Cloudflare phía máy chủ analytics đặt bằng IP máy chủ Yona → mọi khách thành
    // một, rồi bị bộ lọc bot loại âm thầm.
    private const CLIENT_IP_HEADER = 'X-Plausible-IP';

    private const TIMEOUT_SECONDS = 5;

    private const CONNECT_TIMEOUT_SECONDS = 2;

    public function enabled(): bool
    {
        return filled($this->host()) && filled(config('services.plausible.script_path'));
    }

    // Upstream lỗi thì ném bên trong closure để Cache::remember không lưu kết quả hỏng.
    public function script(): ?string
    {
        $scriptUrl = $this->host().config('services.plausible.script_path');

        try {
            return Cache::remember(
                self::SCRIPT_CACHE_KEY_PREFIX.sha1($scriptUrl),
                (int) config('services.plausible.script_ttl'),
                fn () => Http::timeout(self::TIMEOUT_SECONDS)
                    ->connectTimeout(self::CONNECT_TIMEOUT_SECONDS)
                    ->get($scriptUrl)
                    ->throw()
                    ->body(),
            );
        } catch (Throwable) {
            return null;
        }
    }

    // Không chuyển tiếp cookie nào của khách sang máy chủ analytics.
    public function forwardEvent(Request $request): Response
    {
        $clientIp = $this->clientIp($request);

        return Http::timeout(self::TIMEOUT_SECONDS)
            ->connectTimeout(self::CONNECT_TIMEOUT_SECONDS)
            ->withUserAgent((string) $request->userAgent())
            ->withHeaders([
                self::CLIENT_IP_HEADER => $clientIp,
                'X-Forwarded-For' => $clientIp,
            ])
            ->withBody($request->getContent(), 'text/plain')
            ->post($this->host().self::UPSTREAM_EVENT_PATH);
    }

    public function clientIp(Request $request): string
    {
        $headerName = config('services.plausible.client_ip_header');
        $headerValue = filled($headerName) ? (string) $request->header($headerName) : '';
        $candidateIp = trim(explode(',', $headerValue)[0]);

        return filter_var($candidateIp, FILTER_VALIDATE_IP) !== false
            ? $candidateIp
            : (string) $request->ip();
    }

    private function host(): string
    {
        return rtrim((string) config('services.plausible.host'), '/');
    }
}
