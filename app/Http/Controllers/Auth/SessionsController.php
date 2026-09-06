<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserSessionResource;
use App\Models\User;
use App\Models\UserSession;
use App\Services\Mfa\AuthenticationService;
use App\Services\Mfa\TokenService;
use App\Services\UserSessionRevoker;
use App\Services\UserSessionTrackingService;
use App\Support\CurrentUserSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class SessionsController extends Controller
{
    private const LOGIN_PAGE = 'v3/views/login/Index';

    // Link SSO của Platform API / "Impersonate user" trỏ vào chính trang đăng
    // nhập kèm ?email=&sso_auth_token= (như bản gốc); trang tự POST lại đây.
    public function create(Request $request): Response
    {
        return Inertia::render(self::LOGIN_PAGE, [
            'email' => $request->query('email'),
            'ssoAuthToken' => $request->query('sso_auth_token'),
        ]);
    }

    public function store(Request $request): SymfonyResponse|Response
    {
        if ($request->filled('mfa_token')) {
            return $this->verifyMfa($request);
        }

        if ($request->filled('sso_auth_token')) {
            return $this->authenticateWithSsoToken($request);
        }

        $user = $this->authenticateCredentials($request);

        // Mật khẩu đúng nhưng chưa đủ: dừng ở bước OTP, chưa tạo phiên.
        if ($user->mfaEnabled()) {
            return $this->renderMfaStep((new TokenService)->generateToken($user));
        }

        $limitResponse = $this->enforceSessionLimit($request, $user);
        if ($limitResponse) {
            return $limitResponse;
        }

        return $this->completeLogin($request, $user);
    }

    public function destroy(Request $request): SymfonyResponse
    {
        $user = $request->user();

        if ($user) {
            $user->userSessions()->where('client_id', CurrentUserSession::clientId($request))->delete();
        }

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // Ranh giới bundle app.scss → v3.scss (như trên).
        return Inertia::location('/app/login');
    }

    // devise_overrides/sessions_controller#handle_sso_authentication: token dùng
    // một lần, phiên impersonation bỏ qua giới hạn số phiên.
    private function authenticateWithSsoToken(Request $request): SymfonyResponse|Response
    {
        $token = (string) $request->input('sso_auth_token');
        $user = User::fromEmail($request->input('email'));

        if ($user === null || ! $user->validSsoAuthToken($token)) {
            throw ValidationException::withMessages(['email' => __('auth.failed')]);
        }

        $impersonation = $user->ssoAuthTokenIsImpersonation($token);
        $user->invalidateSsoAuthToken($token);

        if (! $impersonation) {
            $limitResponse = $this->enforceSessionLimit($request, $user);
            if ($limitResponse) {
                return $limitResponse;
            }
        }

        return $this->completeLogin($request, $user);
    }

    private function authenticateCredentials(Request $request): User
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $throttleKey = mb_strtolower($credentials['email']).'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            throw ValidationException::withMessages([
                'email' => __('auth.throttle', ['seconds' => RateLimiter::availableIn($throttleKey)]),
            ]);
        }

        $user = User::query()->where('email', mb_strtolower($credentials['email']))->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            RateLimiter::hit($throttleKey);

            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        if (! $user->isConfirmed()) {
            throw ValidationException::withMessages([
                'email' => __('auth.unconfirmed', ['email' => $user->email]),
            ])->errorBag('default')->status(422);
        }

        RateLimiter::clear($throttleKey);

        return $user;
    }

    // Bước 2 của đăng nhập có 2FA: đổi mfa_token + mã OTP/dự phòng lấy phiên.
    private function verifyMfa(Request $request): SymfonyResponse|Response
    {
        $token = (string) $request->input('mfa_token');
        $user = (new TokenService)->verifyToken($token);

        // Lỗi ở bước này phải quay lại ĐÚNG khung nhập mã: dựng lại trang đăng
        // nhập kèm prop lỗi, không ném ValidationException (redirect back sẽ mất
        // mfa_token và người dùng rơi về form mật khẩu).
        if (! $user) {
            return $this->renderMfaStep($token, __('errors.mfa.invalid_token'));
        }

        $authenticated = (new AuthenticationService(
            $user,
            $request->input('otp_code'),
            $request->input('backup_code'),
        ))->authenticate();

        if (! $authenticated) {
            return $this->renderMfaStep($token, __('errors.mfa.invalid_code'));
        }

        // Sau khi qua 2FA thì không hỏi lại người dùng nữa: tự bỏ phiên cũ nhất.
        if ($this->sessionsLimitReached($user)) {
            app(UserSessionRevoker::class)->revokeOldest($user);
        }

        return $this->completeLogin($request, $user);
    }

    private function renderMfaStep(string $mfaToken, ?string $error = null): Response
    {
        return Inertia::render(self::LOGIN_PAGE, [
            'mfaRequired' => true,
            'mfaToken' => $mfaToken,
            'mfaError' => $error,
        ]);
    }

    /** Trả về màn chọn phiên khi đã chạm trần; null khi được phép đăng nhập tiếp. */
    private function enforceSessionLimit(Request $request, User $user): ?Response
    {
        if ($request->boolean('revoke_all_sessions')) {
            app(UserSessionRevoker::class)->revokeAll($user);

            return null;
        }

        if ($request->filled('revoke_session_id')) {
            $session = $user->userSessions()->find($request->input('revoke_session_id'));
            if ($session) {
                app(UserSessionRevoker::class)->revoke($session);
            }

            return null;
        }

        if (! $this->sessionsLimitReached($user)) {
            return null;
        }

        $sessions = $user->userSessions()
            ->orderByDesc('last_activity_at')
            ->get()
            ->map(fn (UserSession $session) => (new UserSessionResource($session))->toArray($request));

        return Inertia::render(self::LOGIN_PAGE, [
            'sessionsLimitReached' => true,
            'sessions' => $sessions,
        ]);
    }

    private function sessionsLimitReached(User $user): bool
    {
        return $user->userSessions()->count() >= (int) config('yona.max_user_sessions');
    }

    private function completeLogin(Request $request, User $user): SymfonyResponse
    {
        Auth::login($user);
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

        // Vượt ranh giới bundle v3.scss → app.scss: phải full-page load,
        // client-side visit sẽ giữ nguyên stylesheet auth (mất font + _base).
        return Inertia::location(session()->pull('url.intended', '/app'));
    }
}
