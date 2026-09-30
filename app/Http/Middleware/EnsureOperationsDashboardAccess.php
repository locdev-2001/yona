<?php

namespace App\Http\Middleware;

use App\Support\SystemAccess;
use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

// Cửa chung của ba dashboard vận hành (/horizon, /pulse, /logs). Ai được vào
// do SystemAccess::canOpenOperationsDashboards() quyết; ở đây chỉ chọn cách từ
// chối: khách lạ về màn đăng nhập, user thường không có quyền hệ thống nhận
// 403, super admin chưa bật 2FA về màn cài 2FA. Nhánh email hệ thống không bắt 2FA.
class EnsureOperationsDashboardAccess
{
    public function __construct(
        private readonly EnsureSuperAdminMfaEnrolled $ensureMfaEnrolled,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::guard(SystemAccess::USER_GUARD)->user();

        if ($user === null && Auth::guard(SystemAccess::SUPER_ADMIN_GUARD)->guest()) {
            throw new AuthenticationException('Unauthenticated.', [SystemAccess::SUPER_ADMIN_GUARD]);
        }

        abort_unless(SystemAccess::canOpenOperationsDashboards(), Response::HTTP_FORBIDDEN);

        if (SystemAccess::isSystemAdmin($user)) {
            return $next($request);
        }

        return $this->ensureMfaEnrolled->handle($request, $next);
    }
}
