<?php

namespace App\Http\Middleware;

use App\Support\SuperAdmin\ConsoleNavigation;
use App\Support\SuperAdmin\DashboardRegistry;
use App\Support\SuperAdminArea;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

// Console quản trị dùng layout riêng: thanh bên theo vùng chức năng, chữ của
// khung dịch sẵn và người đang đăng nhập — chia sẻ một lần ở đây thay vì lặp
// trong từng controller.
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
                    ['key' => 'sticker_packs', 'label' => __('sticker_library.MENU'), 'url' => SuperAdminArea::url('sticker_packs')],
                ],
                'settingsPages' => ConsoleNavigation::appConfigSections(),
                'navGroups' => ConsoleNavigation::groups(),
                'labels' => ConsoleNavigation::labels(),
                'dictionary' => ConsoleNavigation::dictionary(),
                'searchUrl' => SuperAdminArea::url('api/search'),
                'currentUser' => $this->currentUser($request),
                'currentPath' => $request->getPathInfo(),
                'currentUrl' => $request->getRequestUri(),
            ],
            'flash' => fn () => [
                'notice' => $request->session()->get('notice'),
                'error' => $request->session()->get('error'),
                'alert' => $request->session()->get('alert'),
            ],
        ]);

        return $next($request);
    }

    /** @return array{name: string, email: string}|null */
    private function currentUser(Request $request): ?array
    {
        $admin = $request->user('super_admin');

        return $admin === null ? null : [
            'name' => (string) ($admin->name ?: $admin->email),
            'email' => (string) $admin->email,
        ];
    }
}
