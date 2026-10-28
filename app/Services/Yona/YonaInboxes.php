<?php

namespace App\Services\Yona;

use App\Models\Account;
use App\Models\Channel\Yona;
use App\Models\Inbox;
use App\Models\User;
use App\Services\Users\PersonalAccounts;
use Illuminate\Support\Facades\DB;

// Hộp thư Yona của mỗi người: mỗi account cá nhân có đúng một, tạo khi cần.
class YonaInboxes
{
    public function __construct(private readonly PersonalAccounts $accounts) {}

    public function ensureFor(User $user): Inbox
    {
        return $this->ensureForAccount($this->accounts->ensureFor($user));
    }

    public function ensureForAccount(Account $account): Inbox
    {
        $existing = Inbox::query()->where('account_id', $account->id)->where('channel_type', 'Channel::Yona')->first();

        return $existing ?? DB::transaction(function () use ($account) {
            $channel = Yona::query()->firstOrCreate(['account_id' => $account->id]);

            return $account->inboxes()->create([
                'name' => 'Yona',
                'channel_type' => 'Channel::Yona',
                'channel_id' => $channel->id,
            ]);
        });
    }

    public function ownerOf(Inbox $inbox): ?User
    {
        return $inbox->account->owner();
    }
}
