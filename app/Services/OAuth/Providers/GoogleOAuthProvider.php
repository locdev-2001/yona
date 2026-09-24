<?php

namespace App\Services\OAuth\Providers;

use App\Exceptions\Auth\OAuthSignInRefused;
use App\Services\OAuth\OAuthIdentity;
use App\Services\OAuth\OAuthProvider;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Socialite;
use Laravel\Socialite\Two\InvalidStateException;
use Symfony\Component\HttpFoundation\RedirectResponse;

class GoogleOAuthProvider implements OAuthProvider
{
    public const NAME = 'google';

    private const SCOPES = ['openid', 'email', 'profile'];

    public function isConfigured(): bool
    {
        return filled(config('services.google.client_id')) && filled(config('services.google.client_secret'));
    }

    public function redirect(): RedirectResponse
    {
        // Máy dùng chung nhiều tài khoản Google: luôn cho chọn tài khoản thay vì
        // lặng lẽ lấy tài khoản đang đăng nhập trên trình duyệt.
        return $this->socialite()
            ->setScopes(self::SCOPES)
            ->with(['prompt' => 'select_account'])
            ->redirect();
    }

    public function identity(): OAuthIdentity
    {
        try {
            $googleUser = $this->socialite()->user();
        } catch (InvalidStateException) {
            throw OAuthSignInRefused::failed();
        }

        return new OAuthIdentity(
            email: mb_strtolower(trim((string) $googleUser->getEmail())),
            emailVerified: filter_var($googleUser->getRaw()['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN),
            name: $googleUser->getName(),
        );
    }

    private function socialite(): Provider
    {
        return Socialite::driver(self::NAME);
    }
}
