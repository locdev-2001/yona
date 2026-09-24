<?php

namespace App\Http\Controllers\Auth;

use App\Exceptions\Auth\OAuthSignInRefused;
use App\Http\Controllers\Auth\Concerns\CompletesSignIn;
use App\Http\Controllers\Controller;
use App\Services\Mfa\TokenService;
use App\Services\OAuth\OAuthProvider;
use App\Services\OAuth\OAuthProviders;
use App\Services\OAuth\OAuthSignInService;
use App\Services\UserSessionRevoker;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

// Đăng nhập / đăng ký bằng nhà cung cấp OAuth. Cùng một cửa cho cả hai: email
// đã có tài khoản thì đăng nhập, email mới thì tạo tài khoản rồi đăng nhập.
class OAuthController extends Controller
{
    use CompletesSignIn;

    // Khoá lỗi trong `errors` của trang đăng nhập; trang đọc khoá này để báo.
    public const ERROR_KEY = 'oauth';

    public function __construct(
        private readonly OAuthProviders $providers,
        private readonly OAuthSignInService $signIn,
        private readonly UserSessionRevoker $sessionRevoker,
    ) {}

    public function redirect(string $provider): Response
    {
        return $this->configuredProvider($provider)->redirect();
    }

    public function callback(Request $request, string $provider): Response
    {
        $oauthProvider = $this->configuredProvider($provider);

        // Người dùng huỷ ở màn đồng ý hoặc nhà cung cấp từ chối (RFC 6749 §4.1.2.1):
        // không có mã để đổi token, cũng không phải lỗi của hệ thống.
        if ($request->filled('error')) {
            return $this->backToLogin(__('auth.oauth.failed'));
        }

        try {
            $user = $this->signIn->resolveUser($oauthProvider->identity());
        } catch (OAuthSignInRefused $refused) {
            return $this->backToLogin($refused->getMessage());
        } catch (Throwable $exception) {
            report($exception);

            return $this->backToLogin(__('auth.oauth.failed'));
        }

        // Nhà cung cấp chỉ thay cho bước mật khẩu: tài khoản bật 2FA vẫn nhập mã.
        if ($user->mfaEnabled()) {
            return redirect()->route('login')
                ->with(SessionsController::PENDING_MFA_TOKEN, (new TokenService)->generateToken($user));
        }

        $this->sessionRevoker->makeRoomFor($user);

        return $this->completeLogin($request, $user);
    }

    private function configuredProvider(string $name): OAuthProvider
    {
        return $this->providers->configured($name) ?? abort(404);
    }

    private function backToLogin(string $message): RedirectResponse
    {
        return redirect()->route('login')->withErrors([self::ERROR_KEY => $message]);
    }
}
