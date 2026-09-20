<?php

use App\Http\Middleware\AuthenticateApiAccessToken;
use App\Http\Middleware\EnsureAccountRole;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SetCurrentAccount;
use App\Http\Middleware\SetLocale;
use App\Http\Middleware\TrackUserSessionActivity;
use App\Http\Middleware\ValidateCsrfToken;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        // Mặt tiền api (§0.4): không session/CSRF — widget website nhúng trên tên
        // miền khách hàng và Platform API gọi vào đây. Tiền tố nằm trong chính
        // routes/api.php vì bản gốc đặt widget dưới /api/v1 còn Platform API
        // dưới /platform/api/v1 (refs/chatwoot config/routes.rb).
        api: __DIR__.'/../routes/api.php',
        apiPrefix: '',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
        then: function () {
            Route::middleware('web')->group(base_path('routes/web_api.php'));
            Route::middleware('api')->prefix('public/api/v1')->group(base_path('routes/api_public.php'));
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            SetLocale::class,
            HandleInertiaRequests::class,
            TrackUserSessionActivity::class,
        ]);

        // Widget/Platform API cũng phải nói đúng ngôn ngữ của tài khoản.
        $middleware->api(append: [SetLocale::class]);

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

        // Console quản trị có màn đăng nhập riêng (guard `super_admin`).
        // Dashboard vận hành của gói ngoài (/horizon, /pulse, /log-viewer) cũng
        // chạy trên guard super_admin, nên guest phải về đúng màn đăng nhập đó.
        $middleware->redirectGuestsTo(
            fn (Request $request) => $request->is('super_admin', 'super_admin/*', 'horizon', 'horizon/*', 'pulse', 'pulse/*', 'log-viewer', 'log-viewer/*')
                ? '/super_admin/sign_in'
                : '/app/login',
        );
        $middleware->redirectUsersTo(
            fn (Request $request) => $request->is('super_admin', 'super_admin/*') ? '/super_admin' : '/app',
        );
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*', 'public/api/*') || $request->expectsJson(),
        );

        // request_exception_handler.rb: bản ghi không tồn tại trả đúng một câu
        // cho mọi endpoint, không phải body exception mặc định của framework.
        $exceptions->render(function (ModelNotFoundException|NotFoundHttpException $exception, Request $request) {
            if (! $request->is('api/*', 'public/api/*') && ! $request->expectsJson()) {
                return null;
            }

            return response()->json(['error' => 'Resource could not be found'], 404);
        });
    })->create();
