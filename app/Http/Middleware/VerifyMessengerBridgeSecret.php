<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Webhook của sidecar Messenger cá nhân: so hằng thời gian header
 * X-Messenger-Bridge-Secret. Chưa cấu hình secret = từ chối, không cho lọt bằng chuỗi rỗng.
 */
class VerifyMessengerBridgeSecret
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = (string) config('messenger_personal.bridge.webhook_secret');

        if ($expected === '') {
            abort(401, 'Webhook secret not configured.');
        }

        if (! hash_equals($expected, (string) $request->header('X-Messenger-Bridge-Secret', ''))) {
            abort(401, 'Invalid webhook secret.');
        }

        return $next($request);
    }
}
