<?php

namespace App\Http\Middleware;

use App\Support\SystemAccess;
use Closure;
use Illuminate\Auth\Middleware\Authenticate;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureLogViewerAccess
{
    public function __construct(
        private readonly Authenticate $authenticate,
        private readonly EnsureSuperAdminMfaEnrolled $ensureMfaEnrolled,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (SystemAccess::isSystemAdmin($request->user())) {
            return $next($request);
        }

        return $this->authenticate->handle(
            $request,
            fn (Request $authenticated) => $this->ensureMfaEnrolled->handle($authenticated, $next),
            'super_admin',
        );
    }
}
