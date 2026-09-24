<?php

namespace App\Exceptions\Auth;

use Exception;

// Đăng nhập bằng nhà cung cấp OAuth không thành: thông điệp đã dịch, hiện thẳng
// cho người dùng ở trang đăng nhập.
class OAuthSignInRefused extends Exception
{
    public static function failed(): self
    {
        return new self(__('auth.oauth.failed'));
    }

    public static function unverifiedEmail(): self
    {
        return new self(__('auth.oauth.unverified_email'));
    }

    public static function notAllowed(): self
    {
        return new self(__('auth.oauth.not_allowed'));
    }
}
