<?php

namespace App\Http\Controllers\Auth\Concerns;

use App\Models\User;
use App\Services\UserSignInService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

// Bước cuối chung của mọi lối đăng nhập vào dashboard (mật khẩu, 2FA, link SSO,
// nhà cung cấp OAuth): mở phiên rồi đưa về trang định vào.
trait CompletesSignIn
{
    private function completeLogin(Request $request, User $user): Response
    {
        app(UserSignInService::class)->signIn($request, $user);

        // Vượt ranh giới bundle v3.scss → app.scss: phải full-page load,
        // client-side visit sẽ giữ nguyên stylesheet auth (mất font + _base).
        // Request không phải Inertia (quay về từ nhà cung cấp OAuth) nhận 302 thường.
        return Inertia::location(session()->pull('url.intended', '/app'));
    }
}
