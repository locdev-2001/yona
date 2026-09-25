<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\SuperAdmin;
use App\Services\Mfa\AuthenticationService;
use App\Services\Mfa\TokenService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Inertia\Inertia;
use Inertia\Response;

// — đăng nhập riêng cho console quản trị, guard `super_admin`. Dash #39: thêm
// bước OTP (dùng chung service với agent qua App\Services\Mfa) + throttle 5
// lần/phút theo email+IP cho cả bước mật khẩu lẫn bước OTP.
class SessionsController extends Controller
{
    private const MAX_ATTEMPTS = 5;

    public function create(): Response
    {
        Inertia::setRootView('superadmin_auth');

        return Inertia::render('superadmin/Login');
    }

    public function store(Request $request): RedirectResponse|Response
    {
        Inertia::setRootView('superadmin_auth');

        if ($request->filled('otp_token')) {
            return $this->verifyOtp($request);
        }

        $credentials = $request->validate([
            'super_admin.email' => 'required|string',
            'super_admin.password' => 'required|string',
        ])['super_admin'];

        $throttleKey = $this->throttleKey($credentials['email'], $request);

        if (RateLimiter::tooManyAttempts($throttleKey, self::MAX_ATTEMPTS)) {
            return redirect('/super_admin/sign_in')->with(
                'error',
                __('auth.throttle', ['seconds' => RateLimiter::availableIn($throttleKey)]),
            );
        }

        $superAdmin = SuperAdmin::query()->where('email', mb_strtolower($credentials['email']))->first();

        if ($superAdmin === null || ! Hash::check($credentials['password'], $superAdmin->password)) {
            RateLimiter::hit($throttleKey);

            return redirect('/super_admin/sign_in')->with('error', 'Invalid credentials. Please try again.');
        }

        RateLimiter::clear($throttleKey);

        if ($superAdmin->mfaEnabled()) {
            return $this->renderOtpStep((new TokenService)->generateToken($superAdmin));
        }

        $this->login($request, $superAdmin);

        return redirect('/super_admin');
    }

    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('super_admin')->logout();
        $request->session()->forget('login.super_admin');

        return redirect('/');
    }

    // Bước 2: đổi otp_token + mã OTP/dự phòng lấy phiên (giống bước MFA của agent).
    private function verifyOtp(Request $request): RedirectResponse|Response
    {
        $token = (string) $request->input('otp_token');
        $user = (new TokenService)->verifyToken($token);

        if (! $user) {
            return redirect('/super_admin/sign_in')->with('error', __('errors.mfa.invalid_token'));
        }

        $throttleKey = 'super-admin-otp|'.$user->getKey().'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, self::MAX_ATTEMPTS)) {
            return $this->renderOtpStep($token, __('auth.throttle', ['seconds' => RateLimiter::availableIn($throttleKey)]));
        }

        $authenticated = (new AuthenticationService(
            $user,
            $request->input('otp_code'),
            $request->input('backup_code'),
        ))->authenticate();

        if (! $authenticated) {
            RateLimiter::hit($throttleKey);

            return $this->renderOtpStep($token, __('errors.mfa.invalid_code'));
        }

        RateLimiter::clear($throttleKey);

        $this->login($request, SuperAdmin::query()->findOrFail($user->getKey()));

        return redirect('/super_admin');
    }

    private function login(Request $request, SuperAdmin $superAdmin): void
    {
        Auth::guard('super_admin')->login($superAdmin);
        $request->session()->regenerate();
    }

    private function renderOtpStep(string $otpToken, ?string $error = null): Response
    {
        return Inertia::render('superadmin/Login', [
            'otpRequired' => true,
            'otpToken' => $otpToken,
            'otpError' => $error,
        ]);
    }

    private function throttleKey(string $email, Request $request): string
    {
        return 'super-admin-login|'.mb_strtolower($email).'|'.$request->ip();
    }
}
