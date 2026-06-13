<?php

use App\Exceptions\StaleModelException;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\IdentifyWorkspace;
use App\Http\Middleware\SetLocale;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->web(append: [
            SetLocale::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        // Tenant-context middleware — applied per route group (auth + workspace
        // data screens), wired in routes in phase 06.
        $middleware->alias([
            'workspace' => IdentifyWorkspace::class,
        ]);
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
