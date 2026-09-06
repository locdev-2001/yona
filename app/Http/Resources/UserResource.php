<?php

namespace App\Http\Resources;

use App\Models\Account;
use App\Models\User;

// Port từ User#push_event_data (app/models/user.rb). availability_status đi
// theo account_user của account đang đứng (Current.account); không có account
// (vd API widget) thì null y như bản gốc — widget đọc null là "không có chấm
// trạng thái", trả 'offline' sẽ vẽ thừa một chấm xám.
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
            'availability_status' => $membership?->availabilityStatus(),
            'thumbnail' => $user->avatarUrl(),
        ];
    }
}
