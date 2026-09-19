<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Cookie;
use Symfony\Component\HttpFoundation\Response;

/**
 * Chọn ngôn ngữ cho một request — nguồn duy nhất của locale phía máy chủ.
 *
 * Blade in ra `app()->getLocale()` ở thẻ <html lang>, frontend đọc lại từ đó, nên
 * mọi mặt tiền đều thống nhất.
 *
 * Không đoán theo Accept-Language: sản phẩm bán cho SME Việt, khách vãng lai
 * phải thấy tiếng Việt kể cả khi trình duyệt cài tiếng Anh. Muốn đổi thì bấm
 * bộ chọn ngôn ngữ, và lựa chọn đó được nhớ bằng cookie.
 */
class SetLocale
{
    private const COOKIE = 'yona_locale';

    public function handle(Request $request, Closure $next): Response
    {
        $picked = $this->supported((string) $request->query('locale'));

        if ($picked !== null) {
            Cookie::queue(Cookie::forever(self::COOKIE, $picked));
        }

        $locale = $picked ?? $this->resolve($request);

        if ($locale !== null) {
            App::setLocale($locale);
        }

        return $next($request);
    }

    private function resolve(Request $request): ?string
    {
        $candidates = [
            $request->route()?->parameter('locale'),
            data_get($request->user()?->ui_settings, 'locale'),
            $this->accountLocale($request),
            $request->cookie(self::COOKIE),
        ];

        foreach ($candidates as $candidate) {
            if (is_string($candidate) && ($supported = $this->supported($candidate)) !== null) {
                return $supported;
            }
        }

        return null;
    }

    private function accountLocale(Request $request): ?string
    {
        $account = $request->route()?->parameter('account');

        return is_object($account) ? ($account->locale ?? null) : null;
    }

    /** Trả về mã locale đúng như thư mục lang/ nếu được bật, ngược lại null. */
    private function supported(string $candidate): ?string
    {
        if ($candidate === '') {
            return null;
        }

        $enabled = array_column(config('yona.available_locales', []), 'iso_639_1_code');
        $normalized = str_replace('-', '_', $candidate);

        foreach ([$normalized, strtok($normalized, '_')] as $option) {
            if (is_string($option) && in_array($option, $enabled, true)) {
                return $option;
            }
        }

        return null;
    }
}
