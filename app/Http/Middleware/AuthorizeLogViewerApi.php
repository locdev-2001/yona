<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Pipeline\Pipeline;
use Opcodes\LogViewer\Http\Middleware\AuthorizeLogViewer;
use Opcodes\LogViewer\Http\Middleware\EnsureFrontendRequestsAreStateful;
use Symfony\Component\HttpFoundation\Response;

/**
 * Cửa vào API của Log Viewer. Giao diện web đi qua phiên đăng nhập như các
 * dashboard vận hành khác; công cụ ngoài (script điều tra lỗi) đi bằng Bearer
 * token cấu hình ở LOG_VIEWER_API_TOKEN và chỉ được đọc (GET).
 */
class AuthorizeLogViewerApi
{
    private const SESSION_PIPELINE = [
        EnsureFrontendRequestsAreStateful::class,
        EnsureOperationsDashboardAccess::class,
        AuthorizeLogViewer::class,
    ];

    public function __construct(private readonly Pipeline $pipeline) {}

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->bearerToken() === null) {
            return $this->pipeline->send($request)->through(self::SESSION_PIPELINE)->then($next);
        }

        $expected = (string) config('log-viewer.api_token');

        abort_if($expected === '' || ! hash_equals($expected, $request->bearerToken()), Response::HTTP_UNAUTHORIZED);
        abort_unless($request->isMethod('GET'), Response::HTTP_FORBIDDEN);

        return $next($request);
    }
}
