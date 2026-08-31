<?php

namespace App\Http\Middleware;

use App\Models\AccountUser;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Tương đương meta.permissions của router Chatwoot (routeHelpers#validateLoggedInRoutes):
// route ngoài quyền thì đưa về dashboard của account, không báo lỗi.
class EnsureAccountRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $accountUser = $request->attributes->get('currentAccountUser');

        if (! $accountUser instanceof AccountUser || ! in_array($accountUser->roleName(), $roles, true)) {
            return redirect("/app/accounts/{$accountUser?->account_id}/dashboard");
        }

        return $next($request);
    }
}
