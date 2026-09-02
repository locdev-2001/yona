<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\User;
use App\Support\OnlineStatusTracker;

// Port từ concerns/availability_statusable.rb#user_availability_status +
// account_user.rb after_save :update_presence_in_redis (spec gốc không cover hook
// — thêm để khóa hành vi): trạng thái hiển thị chỉ đọc thẳng cột `availability`
// khi auto_offline tắt; còn lại đi theo presence realtime.

function accountUserWithCleanPresence(array $attributes = []): AccountUser
{
    $account = Account::factory()->create();
    OnlineStatusTracker::clearAccount($account->id);

    return AccountUser::factory()->create([
        'account_id' => $account->id,
        'user_id' => User::factory()->create()->id,
        ...$attributes,
    ]);
}

it('reports the stored availability when auto_offline is off', function () {
    $membership = accountUserWithCleanPresence([
        'availability' => AccountUser::AVAILABILITY_ONLINE,
        'auto_offline' => false,
    ]);

    expect($membership->availabilityStatus())->toBe('online');
});

it('reports offline while auto_offline is on and there is no presence', function () {
    $membership = accountUserWithCleanPresence([
        'availability' => AccountUser::AVAILABILITY_ONLINE,
        'auto_offline' => true,
    ]);

    expect($membership->availabilityStatus())->toBe('offline');
});

it('reports the redis status when presence exists', function () {
    $membership = accountUserWithCleanPresence([
        'availability' => AccountUser::AVAILABILITY_ONLINE,
        'auto_offline' => true,
    ]);
    OnlineStatusTracker::updatePresence($membership->account_id, 'User', $membership->user_id);
    OnlineStatusTracker::setStatus($membership->account_id, $membership->user_id, 'busy');

    expect($membership->onlinePresence())->toBeTrue()
        ->and($membership->availabilityStatus())->toBe('busy');
});

it('updates the presence status in redis when availability changes', function () {
    $membership = accountUserWithCleanPresence(['availability' => AccountUser::AVAILABILITY_ONLINE]);

    $membership->update(['availability' => AccountUser::AVAILABILITY_BUSY]);

    expect(OnlineStatusTracker::getStatus($membership->account_id, $membership->user_id))->toBe('busy');
});
