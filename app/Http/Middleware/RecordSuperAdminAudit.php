<?php

namespace App\Http\Middleware;

use App\Services\Admin\Operations\AuditTrail;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

// Mọi request ghi trong vùng đã đăng nhập của console để lại một dòng nhật ký.
// Người làm lấy trước khi chạy request (đăng xuất xong vẫn biết ai).
class RecordSuperAdminAudit
{
    public function __construct(private readonly AuditTrail $auditTrail) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (! AuditTrail::isWrite($request)) {
            return $next($request);
        }

        $superAdmin = Auth::guard('super_admin')->user();
        $response = $next($request);

        try {
            $this->auditTrail->record($request, $response, $superAdmin);
        } catch (Throwable $exception) {
            report($exception);
        }

        return $response;
    }
}
