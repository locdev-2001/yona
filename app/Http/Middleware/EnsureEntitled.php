<?php

namespace App\Http\Middleware;

use App\Services\EntitlementService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gate route theo entitlement flag (mirror AdminCan cho billing).
 *
 * Dùng: Route::middleware('entitled:integration.zalo_personal')
 * → 403 nếu workspace không có flag đó.
 */
class EnsureEntitled
{
    public function __construct(private readonly EntitlementService $entitlementService) {}

    public function handle(Request $request, Closure $next, string $flag): Response
    {
        $workspaceId = currentWorkspace()?->id;

        abort_unless(
            $workspaceId && $this->entitlementService->allows($workspaceId, $flag),
            403,
            "Tính năng này yêu cầu entitlement: {$flag}"
        );

        return $next($request);
    }
}
