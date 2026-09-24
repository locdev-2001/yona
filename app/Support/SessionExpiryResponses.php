<?php

namespace App\Support;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

// Phiên hoặc token CSRF hết hạn thì trang HTML/Inertia phải tự đưa người dùng đi
// tiếp, không hiện trang "Page Expired" của framework. Request nhận JSON (apiClient)
// vẫn nhận nguyên 401/419 để FE tự phục hồi (dashboard/helper/sessionRecovery.ts).
final class SessionExpiryResponses
{
    // Khoá lỗi trong errors bag, trang đăng nhập đọc đúng khoá này để tự thử lại.
    public const PAGE_EXPIRED_ERROR = 'page_expired';

    private const CSRF_TOKEN_MISMATCH_STATUS = 419;

    private const FALLBACK_LOGIN_PATH = '/app/login';

    public static function withoutPageExpiredScreen(Response $response): Response
    {
        if ($response->getStatusCode() !== self::CSRF_TOKEN_MISMATCH_STATUS) {
            return $response;
        }

        // Controller chưa chạy (middleware CSRF chặn trước) nên gửi lại là an toàn;
        // trang đích GET sẽ cấp cookie XSRF-TOKEN mới.
        return back()->withErrors([self::PAGE_EXPIRED_ERROR => __('auth.page_expired')]);
    }

    // Visit Inertia gặp 302 sẽ dựng trang đăng nhập ngay phía client với stylesheet
    // của app. Trả Inertia location để trình duyệt tải lại cả trang; GET thì nhớ
    // url.intended để đăng nhập xong quay về đúng trang đang mở.
    public static function fullPageLoginForInertia(AuthenticationException $exception, Request $request): ?Response
    {
        if (! $request->header('X-Inertia')) {
            return null;
        }

        $loginPath = $exception->redirectTo($request) ?? self::FALLBACK_LOGIN_PATH;

        return Inertia::location(redirect()->guest($loginPath));
    }
}
