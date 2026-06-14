<?php

namespace App\Http\Middleware;

use App\Models\Admin;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;
use Symfony\Component\HttpFoundation\Response;

class BindAdminPermissionScope
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($admin = auth('admin')->user()) {
            DB::statement("select set_config('app.current_workspace', ?, false)", [Admin::PLATFORM_SCOPE]);
            app(PermissionRegistrar::class)->setPermissionsTeamId(Admin::PLATFORM_SCOPE);

            // Roles/permissions may have been resolved (and cached empty) before
            // this scope was bound; drop them so checks reload under the scope.
            $admin->unsetRelation('roles')->unsetRelation('permissions');
        }

        return $next($request);
    }
}
