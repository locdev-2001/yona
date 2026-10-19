<?php

namespace App\Services\Users;

use App\Builders\AccountBuilder;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\User;

// Mỗi người dùng có đúng một hộp thư cá nhân: account mà người đó làm quản trị.
// Người chưa có (đăng ký mới, hoặc tài khoản cũ chưa từng có account) thì tạo ngay.
class PersonalAccounts
{
    public function ownedBy(User $user): ?Account
    {
        return $user->accounts()
            ->wherePivot('role', AccountUser::ROLE_ADMINISTRATOR)
            ->orderBy('accounts.id')
            ->first();
    }

    public function ensureFor(User $user): Account
    {
        if ($account = $this->ownedBy($user)) {
            return $account;
        }

        [, $account] = (new AccountBuilder(
            accountName: $user->availableName(),
            email: $user->email,
            userFullName: $user->name,
            user: $user,
        ))->perform();

        $account->finishOnboarding();

        return $account;
    }
}
