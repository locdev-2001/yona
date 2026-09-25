<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

// Dash #39: super admin chưa bật 2FA không được dùng console — chỉ được phép
// vào /super_admin/mfa/setup (và logout, nằm ngoài middleware này) để tự bật.
// SUPER_ADMIN_REQUIRE_MFA=false tắt hẳn chốt này (tự host, tự chịu rủi ro).
class EnsureSuperAdminMfaEnrolled
{
    public function handle(Request $request, Closure $next): Response
    {
        $superAdmin = Auth::guard('super_admin')->user();

        if ($superAdmin === null || self::satisfied($superAdmin)) {
            return $next($request);
        }

        return redirect()->route('super_admin.mfa.setup');
    }

    // Dùng chung cho gate của /horizon, /pulse, /log-viewer: các dashboard này do
    // gói ngoài đăng ký route nên không đi qua middleware này.
    public static function satisfied(Authenticatable $superAdmin): bool
    {
        return ! config('yona.super_admin_require_mfa') || $superAdmin->mfaEnabled();
    }
}
