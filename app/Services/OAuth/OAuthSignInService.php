<?php

namespace App\Services\OAuth;

use App\Exceptions\Account\InvalidEmail;
use App\Exceptions\Account\UserExists;
use App\Exceptions\Auth\OAuthSignInRefused;
use App\Models\SuperAdmin;
use App\Models\User;
use App\Services\Users\PersonalSignUpService;

// Lõi đăng nhập bằng nhà cung cấp OAuth, không biết nhà cung cấp nào: nhận danh
// tính đã xác thực, trả về người dùng để đăng nhập. Email đã có tài khoản thì
// vào đúng tài khoản đó, email mới thì đăng ký qua đường đăng ký chung.
class OAuthSignInService
{
    public function __construct(private readonly PersonalSignUpService $signUp) {}

    /** @throws OAuthSignInRefused */
    public function resolveUser(OAuthIdentity $identity): User
    {
        if ($identity->email === '' || ! $identity->emailVerified) {
            throw OAuthSignInRefused::unverifiedEmail();
        }

        $user = User::fromEmail($identity->email);

        if ($user === null) {
            return $this->register($identity);
        }

        // Console quản trị chỉ vào bằng mật khẩu ở trang riêng của nó.
        if ($user->type === SuperAdmin::TYPE) {
            throw OAuthSignInRefused::notAllowed();
        }

        if (! $user->isConfirmed()) {
            $this->claimUnconfirmedUser($user);
        }

        return $user;
    }

    private function register(OAuthIdentity $identity): User
    {
        try {
            return $this->signUp->signUp(
                email: $identity->email,
                password: null,
                name: filled($identity->name) ? $identity->name : null,
                emailVerified: true,
            );
        } catch (InvalidEmail|UserExists $exception) {
            throw new OAuthSignInRefused($exception->getMessage());
        }
    }

    // Tài khoản chưa xác nhận có thể do người khác đăng ký trước bằng email này
    // với mật khẩu của họ. Nhà cung cấp vừa chứng minh ai là chủ email, nên xác
    // nhận email và thay mật khẩu cũ để mật khẩu đó không còn dùng được.
    private function claimUnconfirmedUser(User $user): void
    {
        $user->forceFill([
            'confirmed_at' => now(),
            'confirmation_token' => null,
            'password' => User::randomPassword(),
        ])->save();
    }
}
