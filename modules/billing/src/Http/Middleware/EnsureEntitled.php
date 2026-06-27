<?php

namespace Modules\Billing\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Modules\Billing\Services\EntitlementResolver;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gate route theo entitlement flag (mirror AdminCan cho billing).
 *
 * Dùng: Route::middleware('entitled:integration.zalo_personal')
 * → 403 nếu workspace không có flag đó.
 *
 * Không check khi billing module tắt → EntitlementResolver không bind
 * → middleware alias 'entitled' không đăng ký → route không có middleware này.
 */
class EnsureEntitled
{
    public function __construct(private readonly EntitlementResolver $resolver) {}

    public function handle(Request $request, Closure $next, string $flag): Response
    {
        $workspaceId = currentWorkspace()?->id;

        abort_unless(
            $workspaceId && $this->resolver->allows($workspaceId, $flag),
            403,
            "Tính năng này yêu cầu entitlement: {$flag}"
        );

        return $next($request);
    }
}
