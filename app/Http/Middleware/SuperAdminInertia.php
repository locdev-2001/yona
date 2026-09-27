<?php

namespace App\Http\Middleware;

use App\Http\Controllers\SuperAdmin\AppConfigsController;
use App\Support\SuperAdmin\DashboardRegistry;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

// Console quản trị dùng layout riêng (CSS Administrate) và thanh điều hướng
// dựng từ danh bạ dashboard — chia sẻ một lần ở đây thay vì lặp trong từng
// controller.
class SuperAdminInertia
{
    public function __construct(private readonly DashboardRegistry $registry) {}

    public function handle(Request $request, Closure $next): Response
    {
        Inertia::setRootView('superadmin');

        Inertia::share([
            'superAdmin' => fn () => [
                'installationName' => config('yona.branding.installation_name', config('app.name')),
                'logo' => config('yona.branding.logo'),
                'logoThumbnail' => config('yona.branding.logo_thumbnail'),
                'version' => config('yona.version'),
                'navigation' => $this->registry->navigationItems(),
                // Nhãn dịch sẵn ở máy chủ: layout nằm trong entry của console,
                // gọi t() ở đó kéo cả bộ i18n vào mọi trang, kể cả trang đăng nhập.
                'toolPages' => [
                    ['key' => 'sticker_packs', 'label' => __('sticker_library.MENU'), 'url' => '/super_admin/sticker_packs'],
                ],
                'settingsPages' => array_map(fn (string $section) => [
                    'key' => $section,
                    'label' => Str::headline($section),
                    'url' => "/super_admin/app_config?config={$section}",
                ], AppConfigsController::sections()),
                'currentPath' => $request->getPathInfo(),
            ],
            'flash' => fn () => [
                'notice' => $request->session()->get('notice'),
                'error' => $request->session()->get('error'),
                'alert' => $request->session()->get('alert'),
            ],
        ]);

        return $next($request);
    }
}
