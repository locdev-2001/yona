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
        // Nạp cả tư cách thành viên một lần trên instance: một request/job dựng payload
        // của cùng người (người thao tác, người gửi, người được gán) nhiều lượt.
        $membership = $account === null
            ? null
            : $user->loadMissing('accountUsers')->accountUsers->firstWhere('account_id', $account->id);

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

    // User#webhook_data.
    public static function webhookData(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'type' => 'user',
        ];
    }
}
