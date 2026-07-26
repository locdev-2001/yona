<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Xác thực secret cho đường vào của kênh nội bộ.
 *
 * Cùng khuôn với `zalo.bridge.secret` — đây là TRANSPORT của một kênh, không
 * phải API sản phẩm mở cho bên thứ ba (cái đó là P6, có token riêng).
 *
 * Chưa cấu hình secret ⇒ từ chối. Không cho chuỗi rỗng khớp chuỗi rỗng: một
 * biến môi trường quên đặt sẽ biến endpoint này thành cửa mở toang.
 *
 * Alias: native.channel.secret
 */
class VerifyNativeChannelSecret
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = config('integrations.native.inbound_secret', '');

        if ($expected === '' || $expected === null) {
            abort(401, 'Native channel secret not configured.');
        }

        $provided = $request->header('X-Yona-Channel-Secret', '');

        if (! hash_equals((string) $expected, (string) $provided)) {
            abort(401, 'Invalid channel secret.');
        }

        return $next($request);
    }
}
