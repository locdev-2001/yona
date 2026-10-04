<?php

namespace App\Http\Middleware;

use App\Support\SystemAccess;
use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureOperationsDashboardAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::guard(SystemAccess::USER_GUARD)->user();

        if ($user === null && Auth::guard(SystemAccess::SUPER_ADMIN_GUARD)->guest()) {
            throw new AuthenticationException('Unauthenticated.', [SystemAccess::SUPER_ADMIN_GUARD]);
        }

        abort_unless(SystemAccess::canOpenOperationsDashboards(), Response::HTTP_FORBIDDEN);

        return $next($request);
    }
}
