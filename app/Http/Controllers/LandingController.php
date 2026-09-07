<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\View\View;

/**
 * Trang chủ công khai ở gốc tên miền — chuyển từ nhánh `main`.
 *
 * Chatwoot gốc không có màn này: `/` của bản gốc đưa thẳng vào đăng nhập. Đây là
 * bề mặt riêng như widget/survey/portal — blade + entry Vite riêng, không nạp
 * bundle dashboard, nên khách chưa đăng nhập không phải tải cả ứng dụng.
 *
 * Chuỗi hiển thị dịch sẵn ở máy chủ (nguồn duy nhất `lang/{locale}/landing.php`)
 * để trang ra đúng ngôn ngữ ngay lần vẽ đầu, không chớp chữ và không phải gửi
 * kèm bundle i18n của dashboard.
 */
class LandingController extends Controller
{
    public function __invoke(): View
    {
        return view('landing', [
            'landingConfig' => [
                'brand' => [
                    'name' => config('yona.branding.brand_name'),
                    'logo' => config('yona.branding.logo'),
                    'logo_dark' => config('yona.branding.logo_dark'),
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
            ],
        ]);
    }
}
