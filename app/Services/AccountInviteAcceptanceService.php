<?php

namespace App\Services;

use App\Exceptions\Account\InvalidEmail;
use App\Exceptions\Account\InviteLinkUnusable;
use App\Exceptions\Account\UserExists;
use App\Models\AccountInviteLink;
use App\Models\AccountUser;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AccountInviteAcceptanceService
{
    /** @throws InvalidEmail|InviteLinkUnusable|UserExists */
    public function acceptForNewUser(AccountInviteLink $link, string $email, string $password, ?string $name): AccountUser
    {
        User::assertAllowedEmail($email);

        if (User::fromEmail($email) !== null) {
            throw new UserExists;
        }

        [$user, $accountUser] = DB::transaction(function () use ($link, $email, $password, $name) {
            $lockedLink = $this->lock($link);
            $this->assertUsable($lockedLink);

            try {
                $user = User::query()->create([
                    'email' => $email,
                    'name' => $name !== null && $name !== '' ? $name : Str::before($email, '@'),
                    'password' => $password,
                ]);
            } catch (UniqueConstraintViolationException) {
                throw new UserExists;
            }

            return [$user, $this->join($lockedLink, $user)];
        });

        $user->sendConfirmationInstructions();

        return $accountUser;
    }

    /** @throws InviteLinkUnusable */
    public function acceptForExistingUser(AccountInviteLink $link, User $user): AccountUser
    {
        return DB::transaction(function () use ($link, $user) {
            $lockedLink = $this->lock($link);

            $existing = $user->accountUsers()->where('account_id', $lockedLink->account_id)->first();
            if ($existing !== null) {
                return $existing;
            }

            $this->assertUsable($lockedLink);

            return $this->join($lockedLink, $user);
        });
    }

    private function lock(AccountInviteLink $link): AccountInviteLink
    {
        return AccountInviteLink::query()->whereKey($link->id)->lockForUpdate()->firstOrFail();
    }

    private function assertUsable(AccountInviteLink $link): void
    {
        if (! $link->isUsable()) {
            throw new InviteLinkUnusable($link->status());
        }
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
