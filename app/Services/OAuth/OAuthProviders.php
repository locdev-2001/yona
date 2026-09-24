<?php

namespace App\Services\OAuth;

use App\Services\OAuth\Providers\GoogleOAuthProvider;

// Sổ nhà cung cấp đăng nhập OAuth. Nhà cung cấp chưa cấu hình coi như không tồn
// tại: không có nút ở trang đăng nhập/đăng ký và route của nó trả 404.
class OAuthProviders
{
    /** @var array<string, class-string<OAuthProvider>> */
    private const DRIVERS = [
        GoogleOAuthProvider::NAME => GoogleOAuthProvider::class,
    ];

    public function configured(string $name): ?OAuthProvider
    {
        $driverClass = self::DRIVERS[$name] ?? null;

        if ($driverClass === null) {
            return null;
        }

        $provider = app($driverClass);

        return $provider->isConfigured() ? $provider : null;
    }

    /** @return list<string> */
    public function configuredNames(): array
    {
        return array_values(array_filter(
            array_keys(self::DRIVERS),
            fn (string $name) => $this->configured($name) !== null,
        ));
    }
}
