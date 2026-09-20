<?php

namespace App\Http\Middleware;

use App\Models\Account;
use App\Models\Channel\WebWidget;
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
            // ponytail: App::setLocale() ghi đè config('app.locale') và không có ai
            // đặt lại. Dưới PHP-FPM mỗi request boot config mới nên vô hại; chuyển
            // sang Octane/FrankenPHP thì phải chụp APP_LOCALE lúc boot và khôi phục
            // ở nhánh không tra ra ngôn ngữ, nếu không request sau đội ngôn ngữ của
            // request trước.
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
            $this->widgetAccountLocale($request),
            $request->cookie(self::COOKIE),
        ];

        foreach ($candidates as $candidate) {
            if (is_string($candidate) && ($supported = $this->supported($candidate)) !== null) {
                return $supported;
            }
        }

        return null;
    }

    /**
     * Route dashboard khai `{account}` là số (`whereNumber`), nên tham số chỉ là
     * Account khi handler có type-hint Account và Laravel binding ngầm. Route nào
     * nhận id thô thì trước đây rơi hết xuống config('app.locale') — cùng một
     * tài khoản mà màn này tiếng Việt, màn kia tiếng Anh. Nhận cả hai dạng.
     */
    private function accountLocale(Request $request): ?string
    {
        $account = $request->route()?->parameter('account');

        if (is_object($account)) {
            return $account->locale ?? null;
        }

        if (! is_scalar($account) || ! ctype_digit((string) $account)) {
            return null;
        }

        return Account::query()->whereKey((int) $account)->value('locale');
    }

    /**
     * Ngôn ngữ của trang widget: do doanh nghiệp chủ hộp thư chọn, không phải
     * ngôn ngữ trình duyệt của khách — giống khóa `locale` mà /widget/config trả
     * về. Chỉ hỏi ở trang widget để không thêm truy vấn cho mọi request API.
     */
    private function widgetAccountLocale(Request $request): ?string
    {
        $token = $request->query('website_token');

        if (! $request->routeIs('widget') || ! is_string($token) || $token === '') {
            return null;
        }

        return WebWidget::query()->where('website_token', $token)->first()?->inbox?->account?->locale;
    }

    /**
     * Trả về mã locale đúng như thư mục lang/ nếu được bật, ngược lại null.
     *
     * Thử nguyên mã trước (`pt_BR`), rồi mới rút về mã ngôn ngữ (`pt`) — trình
     * duyệt gửi `vi-VN` nhưng bản dịch nằm ở `vi`, không rút gọn thì khách Việt
     * vẫn thấy tiếng Anh.
     */
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
