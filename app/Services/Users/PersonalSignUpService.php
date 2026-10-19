<?php

namespace App\Services\Users;

use App\Exceptions\Account\InvalidEmail;
use App\Exceptions\Account\UserExists;
use App\Models\User;

// Điểm đăng ký duy nhất của người dùng cá nhân: form đăng ký và lần đầu đăng nhập
// bằng nhà cung cấp OAuth cùng đi qua đây. Không tạo account; username chọn sau
// ở màn chào mừng. Email chưa xác minh thì gửi thư xác nhận.
class PersonalSignUpService
{
    /** @throws InvalidEmail|UserExists */
    public function signUp(string $email, ?string $password, ?string $name, bool $emailVerified): User
    {
        $email = mb_strtolower(trim($email));

        User::assertAllowedEmail($email);

        if (User::query()->where('email', $email)->exists()) {
            throw new UserExists;
        }

        $user = User::query()->create([
            'email' => $email,
            'password' => $password ?? User::randomPassword(),
            'name' => filled($name) ? $name : ucfirst(strtok($email, '@')),
            'confirmed_at' => $emailVerified ? now() : null,
        ]);

        if (! $emailVerified) {
            $user->sendConfirmationInstructions();
        }

        return $user;
    }
}
