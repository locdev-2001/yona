<?php

namespace App\Services;

use App\Models\User;
use App\Support\CurrentUserSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

// Điểm đăng nhập duy nhất của guard `web` (form đăng nhập, link SSO, đặt lại mật
// khẩu, xác nhận email): mọi phiên sinh ra đều có dòng user_sessions nên hiện ở
// Hồ sơ → Phiên đăng nhập và thu hồi được.
class UserSignInService
{
    public function signIn(Request $request, User $user): void
    {
        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        $user->forceFill([
            'sign_in_count' => $user->sign_in_count + 1,
            'last_sign_in_at' => $user->current_sign_in_at,
            'last_sign_in_ip' => $user->current_sign_in_ip,
            'current_sign_in_at' => now(),
            'current_sign_in_ip' => $request->ip(),
        ])->save();

        $clientId = $request->session()->getId();
        CurrentUserSession::remember($request, $clientId);
        (new UserSessionTrackingService($user, $request, $clientId))->createOrUpdate();
    }
}
