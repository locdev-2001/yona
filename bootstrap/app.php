<?php

use App\Exceptions\StaleModelException;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SetLocale;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;
use App\Http\Middleware\AdminCan;
use App\Http\Middleware\BindAdminPermissionScope;
use App\Http\Middleware\BlockDuringImpersonation;
use App\Http\Middleware\IdentifyWorkspace;
use App\Http\Middleware\ResetTenantContext;
use App\Http\Middleware\VerifyZaloBridgeSecret;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Clear any leaked RLS context first (Octane/persistent-connection safety).
        $middleware->web(prepend: [
            ResetTenantContext::class,
        ]);

        // Same defense for module API routes (Zalo webhook, future api endpoints):
        // a pooled connection could carry stale RLS context into an api request.
        $middleware->api(prepend: [
            ResetTenantContext::class,
        ]);

        $middleware->web(append: [
            SetLocale::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        // Tenant-context middleware — applied per route group (auth + workspace
        // data screens).
        $middleware->alias([
            'workspace' => IdentifyWorkspace::class,
            'admin.scope' => BindAdminPermissionScope::class,
            'admin.can' => AdminCan::class,
            'no.impersonation' => BlockDuringImpersonation::class,
            'zalo.bridge.secret' => VerifyZaloBridgeSecret::class,
        ]);

        // Guard-aware redirects: admin routes redirect to admin endpoints.
        $middleware->redirectGuestsTo(fn (Request $r) => $r->is('admin*') ? route('admin.login') : route('login'));
        $middleware->redirectUsersTo(fn (Request $r) => $r->is('admin*') ? route('admin.dashboard') : route('dashboard'));

        // The workspace (RLS) context MUST be established before route-model
        // binding queries tenant tables — otherwise binding runs default-denied
        // and 404s every {team}/{member}. Bindings resolve in SubstituteBindings.
        $middleware->prependToPriorityList(
            before: SubstituteBindings::class,
            prepend: IdentifyWorkspace::class,
        );
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Optimistic-concurrency loss (BR-X08) → 409 for APIs; for Inertia,
        // redirect back with a flash error so the page can prompt a reload.
        $exceptions->render(function (StaleModelException $e, Request $request) {
            if ($request->header('X-Inertia')) {
                return back(303)->with('error', $e->getMessage());
            }

            return response()->json(['message' => $e->getMessage()], 409);
        });
    })->create();
