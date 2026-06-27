<?php

namespace App\Http\Middleware;

use App\Models\Admin;
use Modules\Tenancy\Support\TenantScope;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class BindAdminPermissionScope
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($admin = auth('admin')->user()) {
            TenantScope::bind(Admin::PLATFORM_SCOPE);

            // Roles/permissions may have been resolved (and cached empty) before
            // this scope was bound; drop them so checks reload under the scope.
            $admin->unsetRelation('roles')->unsetRelation('permissions');
        }

        return $next($request);
    }
}
