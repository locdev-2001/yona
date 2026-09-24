<?php

namespace App\Builders;

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\User;
use App\Notifications\ConfirmationInstructions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

// Bỏ: usage_limits[:agents] + reserve_email_send_capacity (billing cloud/EE).
class AgentBuilder
{
    private ?User $user = null;

    private bool $isNewUser = false;

    // Chữ ký giữ đúng pattr_initialize gốc: default áp khi caller KHÔNG truyền
    // (bulk_create), còn null truyền vào thì bị loại như `.compact` của Rails
    // nên cột đó dùng default của bảng (đường create qua controller).
    public function __construct(
        private readonly string $email,
        private readonly User $inviter,
        private readonly Account $account,
        private ?string $name = null,
        private readonly ?string $role = 'agent',
        private readonly ?string $availability = 'offline',
        private readonly ?bool $autoOffline = false,
    ) {}

    public function perform(): User
    {
        DB::transaction(function () {
            // Tương đương account.with_lock — serialize các lời mời chạy song song.
            Account::query()->whereKey($this->account->id)->lockForUpdate()->first();

            $this->user = $this->findOrCreateUser();
            $this->createAccountUser();
        });

        if ($this->userNeedsConfirmation()) {
            $this->user->notify(new ConfirmationInstructions);
        }

        return $this->user;
    }

    private function findOrCreateUser(): User
    {
        $existingUser = User::fromEmail($this->email);
        if ($existingUser !== null) {
            return $existingUser;
        }

        if ($this->name === null || $this->name === '') {
            $this->name = Str::before($this->email, '@');
        }

        $user = new User([
            'email' => $this->email,
            'name' => $this->name,
            'password' => '1!aA'.Str::random(12),
        ]);
        $user->confirmation_token = Str::random(40);
        $user->confirmation_sent_at = now();
        $user->save();

        $this->isNewUser = true;

        return $user;
    }

    private function userNeedsConfirmation(): bool
    {
        return $this->isNewUser && $this->user->exists && ! $this->user->isConfirmed();
    }

    private function createAccountUser(): AccountUser
    {
        return AccountUser::create(array_filter([
            'account_id' => $this->account->id,
            'user_id' => $this->user->id,
            'inviter_id' => $this->inviter->id,
            'role' => $this->role === null ? null : AccountUser::roleFromName($this->role),
            'availability' => $this->availability === null
                ? null
                : AccountUser::availabilityFromName($this->availability),
            'auto_offline' => $this->autoOffline,
        ], fn ($value) => $value !== null));
    }
}
