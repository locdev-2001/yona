<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Middleware\TrustProxies as FrameworkTrustProxies;
use Illuminate\Http\Request;

/**
 * IP khách thật khi app đứng sau proxy trong `config/trustedproxy.php`.
 *
 * Request từ proxy tin cậy: IP lấy từ header IP khách của proxy (ưu tiên), rồi
 * X-Forwarded-For. Request từ nguồn khác: giữ REMOTE_ADDR, mọi header bỏ qua.
 */
class TrustProxies extends FrameworkTrustProxies
{
    private const FORWARDED_FOR_HEADER = 'X-Forwarded-For';

    // Chỉ tin IP. Host và scheme vẫn do nginx quyết, để header giả đi xuyên
    // proxy không đổi được URL mà app sinh ra (link đặt lại mật khẩu...).
    protected $headers = Request::HEADER_X_FORWARDED_FOR;

    public function handle(Request $request, Closure $next)
    {
        return parent::handle($request, function (Request $request) use ($next) {
            $this->preferProxyClientIpHeader($request);

            return $next($request);
        });
    }

    // Proxy ghi đè header này bằng IP kết nối thật, còn X-Forwarded-For thì nối
    // thêm vào giá trị khách tự gửi. Đưa nó vào X-Forwarded-For để ip() của
    // framework vẫn là nguồn đọc IP duy nhất.
    private function preferProxyClientIpHeader(Request $request): void
    {
        $headerName = config('trustedproxy.client_ip_header');

        if (! $headerName || ! $request->isFromTrustedProxy()) {
            return;
        }

        $clientIp = trim((string) $request->headers->get($headerName));

        if (filter_var($clientIp, FILTER_VALIDATE_IP) !== false) {
            $request->headers->set(self::FORWARDED_FOR_HEADER, $clientIp);
        }
    }
}
