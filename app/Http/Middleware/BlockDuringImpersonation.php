<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Blocks destructive self-account actions while an admin is impersonating
 * (account delete, password change). Prevents unintended mutation of the
 * impersonated user's credentials. Alias: 'no.impersonation'.
 */
class BlockDuringImpersonation
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_if(
            $request->session()->has('impersonator_admin_id'),
            403,
            'Not allowed while impersonating.'
        );

        return $next($request);
    }
}
