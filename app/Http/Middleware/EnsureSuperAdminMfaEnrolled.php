<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureSuperAdminMfaEnrolled
{
    public function handle(Request $request, Closure $next): Response
    {
        $superAdmin = Auth::guard('super_admin')->user();

        if ($superAdmin === null || $superAdmin->mfaEnabled()) {
            return $next($request);
        }

        return redirect()->route('admin.mfa.setup');
    }
}
