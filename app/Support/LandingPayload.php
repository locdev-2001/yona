<?php

namespace App\Support;

/**
 * Cấu hình đẩy xuống mọi trang của bề mặt công khai (`landing.blade.php`).
 *
 * Một blade và một entry Vite cho tất cả các trang: `page` quyết định component
 * nào được mount. Lý do không tách blade mỗi trang: `tailwind.landing.config.js`
 * liệt kê blade theo đúng tên tệp, nên mỗi blade mới là một chỗ nữa phải nhớ
 * khai báo, và quên thì class chỉ dùng ở trang đó bị loại khỏi CSS.
 */
final class LandingPayload
{
    /**
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    public static function make(string $page, array $extra = []): array
    {
        $strings = trans('landing');

        return [
            'page' => $page,
            'meta' => $extra['meta'] ?? $strings['meta'],
            'brand' => [
                'name' => config('yona.branding.brand_name'),
                'logo' => config('yona.branding.logo'),
            ],
            'isAuthenticated' => auth()->check(),
            'urls' => [
                'home' => route('home'),
                'login' => route('login'),
                'register' => route('signup'),
                'dashboard' => route('dashboard'),
                'demo' => route('demo_request.create'),
                'zalo' => route('channels.zalo_personal'),
                // Cùng nguồn với link dưới nút đăng ký: cài đặt nào trỏ
                // TERMS_URL/PRIVACY_URL ra ngoài thì footer cũng theo.
                'terms' => config('yona.terms_url'),
                'privacy' => config('yona.privacy_url'),
            ],
            'legalNav' => trans('legal.nav'),
            // Rỗng khi chưa có số thật: trang ẩn khối liên hệ thay vì bày một số
            // không ai bắt máy.
            'contact' => [
                'hotline' => config('yona.marketing.hotline'),
                'zaloUrl' => config('yona.marketing.zalo_url'),
            ],
            'strings' => $strings,
            'year' => now()->year,
            'locale' => app()->getLocale(),
            // Bộ chọn ngôn ngữ đi qua ?locale=, middleware SetLocale ghi nhớ bằng
            // cookie nên lần sau vào thẳng không cần tham số. Giữ nguyên trang
            // đang xem: đổi ngôn ngữ ở trang Zalo không được nhảy về trang chủ.
            'locales' => self::locales(),
            ...$extra,
        ];
    }

    /**
     * Tiếng Việt đứng đầu bộ chọn: thị trường chính là Việt Nam, và thứ tự trong
     * config là thứ tự chữ cái chứ không mang ý nghĩa sản phẩm.
     *
     * @return list<array{code: string, label: string, url: string}>
     */
    private static function locales(): array
    {
        $locales = array_map(fn (array $locale) => [
            'code' => $locale['iso_639_1_code'],
            'label' => $locale['name'],
            'url' => request()->fullUrlWithQuery(['locale' => $locale['iso_639_1_code']]),
        ], config('yona.available_locales', []));

        usort($locales, fn (array $a, array $b) => ($b['code'] === 'vi') <=> ($a['code'] === 'vi'));

        return $locales;
    }
}
