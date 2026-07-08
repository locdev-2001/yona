<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guard-aware capability check for the admin plane. The built-in `can:` middleware
 * resolves the default (web) guard, which is wrong on /admin routes — this checks
 * the authenticated admin's permission instead.
 */
class AdminCan
{
    public function handle(Request $request, Closure $next, string $ability): Response
    {
        $admin = auth('admin')->user();
        $admin?->unsetRelation('roles')->unsetRelation('permissions');

        abort_unless($admin?->can($ability), 403);

        return $next($request);
    }
}
