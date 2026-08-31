<?php

use App\Models\AccountUser;

// Port từ concerns/availability_statusable.rb#user_availability_status:
// trạng thái hiển thị chỉ đọc thẳng cột `availability` khi auto_offline tắt;
// còn lại đi theo presence realtime (chưa có OnlineStatusTracker → offline).

it('reports the stored availability when auto_offline is off', function () {
    $membership = AccountUser::factory()->create([
        'availability' => AccountUser::AVAILABILITY_ONLINE,
        'auto_offline' => false,
    ]);

    expect($membership->availabilityStatus())->toBe('online');
});

it('reports offline while auto_offline is on and there is no presence', function () {
    $membership = AccountUser::factory()->create([
        'availability' => AccountUser::AVAILABILITY_ONLINE,
        'auto_offline' => true,
    ]);

    expect($membership->availabilityStatus())->toBe('offline');
});
