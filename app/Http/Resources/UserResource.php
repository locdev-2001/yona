<?php

namespace App\Http\Resources;

use App\Models\Account;
use App\Models\User;

// Port từ User#push_event_data (app/models/user.rb). availability_status đi
// theo account_user của account đang đứng (Current.account) — không có account
// thì như gốc trả nil, ở đây giữ 'offline' để payload không đổi shape.
final class UserResource
{
    public static function pushEventData(User $user, ?Account $account = null): array
    {
        $account ??= request()->attributes->get('currentAccount');
        $membership = $account === null
            ? null
            : $user->accountUsers()->where('account_id', $account->id)->first();

        return [
            'id' => $user->id,
            'name' => $user->name,
            'available_name' => $user->availableName(),
            'avatar_url' => $user->avatarUrl(),
            'type' => 'user',
            'availability_status' => $membership?->availabilityStatus() ?? 'offline',
            'thumbnail' => $user->avatarUrl(),
        ];
    }
}
