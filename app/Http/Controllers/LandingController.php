<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\View\View;

class LandingController extends Controller
{
    public function __invoke(): View
    {
        return view('landing', [
            'landingConfig' => [
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
                ],
                'strings' => trans('landing'),
                'year' => now()->year,
                'locale' => app()->getLocale(),
                // Bộ chọn ngôn ngữ đi qua ?locale=, middleware SetLocale ghi nhớ
                // bằng cookie nên lần sau vào thẳng không cần tham số.
                'locales' => $this->locales(),
            ],
        ]);
    }

    /**
     * Tiếng Việt đứng đầu bộ chọn: thị trường chính là Việt Nam, và thứ tự trong
     * config là thứ tự chữ cái chứ không mang ý nghĩa sản phẩm.
     */
    private function locales(): array
    {
        $locales = array_map(fn (array $locale) => [
            'code' => $locale['iso_639_1_code'],
            'label' => $locale['name'],
            'url' => route('home', ['locale' => $locale['iso_639_1_code']]),
        ], config('yona.available_locales', []));

        usort($locales, fn (array $a, array $b) => ($b['code'] === 'vi') <=> ($a['code'] === 'vi'));

        return $locales;
    }
}
