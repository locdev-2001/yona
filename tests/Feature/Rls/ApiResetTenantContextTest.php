<?php

use App\Http\Middleware\ResetTenantContext;
use Illuminate\Contracts\Http\Kernel;

/**
 * FIX 2 — Defense-in-depth: the 'api' middleware group MUST prepend
 * ResetTenantContext so a pooled connection (Octane/PgBouncer) cannot carry
 * stale RLS context (app.current_workspace) into a module API route (e.g. the
 * Zalo webhook, or any future api endpoint). The 'web' group already has it;
 * this guards the api group against the same cross-tenant leak.
 *
 * Asserting on the registered group (not a request) is deterministic and
 * survives route changes — the protection is the middleware being present.
 */
it('api middleware group prepends ResetTenantContext (RLS reset for pooled api routes)', function () {
    $kernel = app(Kernel::class);

    $groups = $kernel->getMiddlewareGroups();

    expect($groups)->toHaveKey('api');
    expect($groups['api'])->toContain(ResetTenantContext::class);
})->group('rls');
