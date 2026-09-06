<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Port từ nhánh `main`. So sánh hằng thời gian secret trên header
 * X-Zalo-Personal-Bridge-Secret. Chưa cấu hình secret = từ chối (không cho
 * bypass bằng chuỗi rỗng).
 */
class VerifyZaloBridgeSecret
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = (string) config('zalo.bridge.webhook_secret');

        if ($expected === '') {
            abort(401, 'Webhook secret not configured.');
        }

        if (! hash_equals($expected, (string) $request->header('X-Zalo-Personal-Bridge-Secret', ''))) {
            abort(401, 'Invalid webhook secret.');
        }

        return $next($request);
    }
}
