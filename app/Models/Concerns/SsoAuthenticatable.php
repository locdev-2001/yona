<?php

namespace App\Models\Concerns;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

// Token đăng nhập một lần, sống 5 phút trong cache (bản gốc dùng Redis::Alfred).
trait SsoAuthenticatable
{
    public const SSO_TOKEN_TTL_SECONDS = 300;

    public function generateSsoAuthToken(bool $impersonation = false): string
    {
        $token = bin2hex(random_bytes(32));

        Cache::put($this->ssoTokenKey($token), $impersonation ? 'impersonation' : 'normal', self::SSO_TOKEN_TTL_SECONDS);

        return $token;
    }

    public function invalidateSsoAuthToken(string $token): void
    {
        Cache::forget($this->ssoTokenKey($token));
    }

    public function validSsoAuthToken(string $token): bool
    {
        return Cache::get($this->ssoTokenKey($token)) !== null;
    }

    public function ssoAuthTokenIsImpersonation(string $token): bool
    {
        return Cache::get($this->ssoTokenKey($token)) === 'impersonation';
    }

    public function generateSsoLink(bool $impersonation = false): string
    {
        $query = [
            'email' => $this->email,
            'sso_auth_token' => $this->generateSsoAuthToken($impersonation),
        ];

        if ($impersonation) {
            $query['impersonation'] = 'true';
        }

        return rtrim((string) config('app.url'), '/').'/app/login?'.http_build_query($query);
    }

    private function ssoTokenKey(string $token): string
    {
        return Str::of('USER_SSO_AUTH_TOKEN::')->append($this->getKey(), '::', $token)->value();
    }
}
