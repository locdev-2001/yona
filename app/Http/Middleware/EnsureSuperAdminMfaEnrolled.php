<?php

namespace App\Http\Middleware;

use Closure;
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
        if (! config('yona.super_admin_require_mfa')) {
            return $next($request);
        }

        $superAdmin = Auth::guard('super_admin')->user();

        if ($superAdmin === null || $superAdmin->mfaEnabled()) {
            return $next($request);
        }

        return redirect()->route('super_admin.mfa.setup');
    }
}
