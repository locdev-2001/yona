<?php

namespace App\Services\OAuth;

use App\Exceptions\Auth\OAuthSignInRefused;
use Symfony\Component\HttpFoundation\RedirectResponse;

// Hợp đồng của một nhà cung cấp đăng nhập OAuth. Thêm nhà cung cấp = thêm một
// driver và khai nó ở OAuthProviders; lõi đăng nhập không đổi.
interface OAuthProvider
{
    public function isConfigured(): bool;

    public function redirect(): RedirectResponse;

    /** @throws OAuthSignInRefused khi phản hồi trả về không hợp lệ (state sai, hết hạn). */
    public function identity(): OAuthIdentity;
}
