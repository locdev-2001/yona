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

    // Nguyên tử: lấy loại token ('impersonation'/'normal') và vô hiệu nó trong
    // một thao tác cache duy nhất, để hai request song song cùng token không
    // thể cùng đăng nhập được. Trả về null nếu token không tồn tại/đã hết hạn.
    public function redeemSsoAuthToken(string $token): ?string
    {
        return Cache::pull($this->ssoTokenKey($token));
    }

    public function generateSsoLink(bool $impersonation = false): string
    {
        return $this->ssoLoginUrl($this->generateSsoAuthToken($impersonation), $impersonation);
    }

    public function ssoLoginUrl(string $token, bool $impersonation = false): string
    {
        $query = [
            'email' => $this->email,
            'sso_auth_token' => $token,
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
