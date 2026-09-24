<?php

namespace App\Services;

use App\Builders\AccountBuilder;
use App\Exceptions\Account\InvalidEmail;
use App\Exceptions\Account\UserExists;
use App\Models\User;

// Điểm đăng ký tài khoản duy nhất: form đăng ký và lần đầu đăng nhập bằng nhà
// cung cấp OAuth cùng đi qua đây (chặn tên miền, chặn email trùng, tạo account
// kèm quyền quản trị). Email chưa xác minh thì gửi thư xác nhận.
class AccountSignUpService
{
    /** @throws InvalidEmail|UserExists */
    public function signUp(
        string $email,
        ?string $password,
        ?string $accountName,
        ?string $userFullName,
        bool $emailVerified,
    ): User {
        [$user] = (new AccountBuilder(
            accountName: $accountName,
            email: $email,
            userFullName: $userFullName,
            userPassword: $password ?? User::randomPassword(),
            confirmed: $emailVerified,
        ))->perform();

        if (! $emailVerified) {
            $user->sendConfirmationInstructions();
        }

        return $user;
    }
}
