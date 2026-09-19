<?php

namespace App\Http\Middleware;

use App\Models\Channel\WebWidget;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

/**
 * Chọn ngôn ngữ cho một request — nguồn duy nhất của locale phía máy chủ.
 *
 * Blade in ra `app()->getLocale()` ở thẻ <html lang>, frontend đọc lại từ đó, nên
 * mọi mặt tiền (dashboard, widget, portal công khai, survey, email) dùng chung
 * đúng một cách quyết định thứ tự ưu tiên này.
 */
class SetLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $this->resolve($request);

        if ($locale !== null) {
            App::setLocale($locale);
        }

        return $next($request);
    }

    private function resolve(Request $request): ?string
    {
        $candidates = [
            $request->route()?->parameter('locale'),
            $request->query('locale'),
            data_get($request->user()?->ui_settings, 'locale'),
            $this->accountLocale($request),
            $this->widgetAccountLocale($request),
            // Khách vô danh (trang chủ, portal, survey) chưa có hồ sơ để hỏi:
            // theo ngôn ngữ trình duyệt, chỉ nhận khi khớp locale đang bật —
            // không khớp thì rơi về `app.locale` như cũ.
            ...$request->getLanguages(),
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
