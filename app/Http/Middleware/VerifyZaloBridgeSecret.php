<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Xác thực HMAC secret từ bridge (X-Zalo-Personal-Bridge-Secret header).
 *
 * Dùng hash_equals (constant-time comparison) để tránh timing attack.
 * Secret cấu hình qua config('services.zalo_bridge.webhook_secret') / env ZALO_BRIDGE_WEBHOOK_SECRET.
 *
 * Alias: zalo.bridge.secret
 */
class VerifyZaloBridgeSecret
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = config('services.zalo_bridge.webhook_secret', '');

        // Nếu chưa cấu hình secret → reject (không cho bypass bằng empty)
        if ($expected === '' || $expected === null) {
            abort(401, 'Webhook secret not configured.');
        }

        $provided = $request->header('X-Zalo-Personal-Bridge-Secret', '');

        if (! hash_equals((string) $expected, (string) $provided)) {
            abort(401, 'Invalid webhook secret.');
        }

        return $next($request);
    }
}
