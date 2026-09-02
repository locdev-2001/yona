<?php

use App\Http\Middleware\AuthenticateApiAccessToken;
use App\Http\Middleware\EnsureAccountRole;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SetCurrentAccount;
use App\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
        then: function () {
            Route::middleware('web')->group(base_path('routes/web_api.php'));
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            HandleInertiaRequests::class,
        ]);

        // Request mang api_access_token không có cookie phiên → miễn CSRF
        // (token là bằng chứng chống CSRF), như API controller của Chatwoot.
        $middleware->web(replace: [
            PreventRequestForgery::class => ValidateCsrfToken::class,
        ]);

        $middleware->alias([
            'account.scope' => SetCurrentAccount::class,
            'account.role' => EnsureAccountRole::class,
            'auth.api_token' => AuthenticateApiAccessToken::class,
        ]);

        $middleware->redirectGuestsTo('/app/login');
        $middleware->redirectUsersTo('/app');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
