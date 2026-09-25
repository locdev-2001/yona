<?php

namespace App\Services;

use App\Exceptions\Account\InviteLinkUnusable;
use App\Exceptions\Account\UserExists;
use App\Models\AccountInviteLink;
use App\Models\AccountUser;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

// Nhận lời mời qua link — hai lối vào: người mới ký mật khẩu ngay trên trang
// công khai (coi như xác nhận email tại chỗ, cùng thời điểm email invite tự
// confirm khi đặt mật khẩu — xem docs/ux-decisions.md), hoặc người đã đăng
// nhập bấm tham gia một chạm.
class AccountInviteAcceptanceService
{
    public function acceptForNewUser(AccountInviteLink $link, string $email, string $password, ?string $name): AccountUser
    {
        if (User::fromEmail($email) !== null) {
            throw new UserExists;
        }

        return DB::transaction(function () use ($link, $email, $password, $name) {
            $lockedLink = $this->lockAndValidate($link);

            $user = new User([
                'email' => $email,
                'name' => $name !== null && $name !== '' ? $name : Str::before($email, '@'),
                'password' => $password,
                // Tin cậy ngay: mật khẩu đặt trực tiếp trên trang này, không có
                // bước xác nhận email riêng như luồng tự đăng ký công khai.
                'confirmed_at' => now(),
            ]);
            $user->save();

            return $this->join($lockedLink, $user);
        });
    }

    public function acceptForExistingUser(AccountInviteLink $link, User $user): AccountUser
    {
        return DB::transaction(function () use ($link, $user) {
            $existing = $user->accountUsers()->where('account_id', $link->account_id)->first();
            if ($existing !== null) {
                // Bấm hai lần / mở hai tab không được tính thêm một lượt dùng.
                return $existing;
            }

            $lockedLink = $this->lockAndValidate($link);

            return $this->join($lockedLink, $user);
        });
    }

    // lockForUpdate trên chính link — serialize dùng link này song song để
    // không vượt max_uses (tương đương account.with_lock của AgentBuilder,
    // nhưng khoá đối tượng đang cạnh tranh thay vì khoá cả account).
    private function lockAndValidate(AccountInviteLink $link): AccountInviteLink
    {
        $locked = AccountInviteLink::query()->whereKey($link->id)->lockForUpdate()->firstOrFail();

        if (! $locked->isUsable()) {
            throw new InviteLinkUnusable($locked->status());
        }

        return $locked;
    }

    private function join(AccountInviteLink $link, User $user): AccountUser
    {
        $accountUser = AccountUser::create([
            'account_id' => $link->account_id,
            'user_id' => $user->id,
            'role' => $link->role,
            'inviter_id' => $link->created_by_id,
            'invite_link_id' => $link->id,
        ]);

        $link->increment('use_count');

        return $accountUser;
    }
}
