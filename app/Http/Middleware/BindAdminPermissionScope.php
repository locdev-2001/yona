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
        if (auth('admin')->check()) {
            DB::statement("select set_config('app.current_workspace', ?, false)", [Admin::PLATFORM_SCOPE]);
            app(PermissionRegistrar::class)->setPermissionsTeamId(Admin::PLATFORM_SCOPE);
        }

        return $next($request);
    }
}
