<?php

use App\Jobs\Notification\DeleteNotificationJob;
use App\Jobs\Notification\RemoveOldNotificationJob;
use App\Jobs\Notification\ReopenSnoozedNotificationsJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\Notification;
use App\Models\User;

function notificationForJob(Account $account, User $user, array $attributes = []): Notification
{
    $conversation = Conversation::factory()->create(['account_id' => $account->id]);

    return Notification::factory()->create([
        'account_id' => $account->id,
        'user_id' => $user->id,
        'primary_actor_id' => $conversation->id,
        ...$attributes,
    ]);
}

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->user = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->user->id]);
});

describe('DeleteNotificationJob', function () {
    it('deletes only the read notifications when asked', function () {
        $unread = notificationForJob($this->account, $this->user);
        notificationForJob($this->account, $this->user, ['read_at' => now()]);

        (new DeleteNotificationJob($this->user, $this->account, DeleteNotificationJob::TYPE_READ))->handle();

        expect(Notification::query()->pluck('id')->all())->toBe([$unread->id]);
    });

    it('deletes every notification of the user in that account', function () {
        notificationForJob($this->account, $this->user);
        notificationForJob($this->account, $this->user, ['read_at' => now()]);

        (new DeleteNotificationJob($this->user, $this->account))->handle();

        expect(Notification::query()->count())->toBe(0);
    });
});

describe('ReopenSnoozedNotificationsJob', function () {
    it('brings a due notification back as unread and records the previous snooze', function () {
        $notification = notificationForJob($this->account, $this->user, [
            'snoozed_until' => now()->subMinute(),
            'read_at' => now(),
        ]);

        (new ReopenSnoozedNotificationsJob)->handle();
        $notification->refresh();

        expect($notification->snoozed_until)->toBeNull()
            ->and($notification->read_at)->toBeNull()
            ->and($notification->meta['last_snoozed_at'])->not->toBeNull();
    });

    it('leaves a notification snoozed into the future alone', function () {
        $notification = notificationForJob($this->account, $this->user, ['snoozed_until' => now()->addDay()]);

        (new ReopenSnoozedNotificationsJob)->handle();

        expect($notification->fresh()->snoozed_until)->not->toBeNull();
    });
});

describe('RemoveOldNotificationJob', function () {
    it('removes notifications older than a month', function () {
        $old = notificationForJob($this->account, $this->user);
        $old->newModelQuery()->whereKey($old->id)->update(['created_at' => now()->subMonths(2)]);
        $recent = notificationForJob($this->account, $this->user);

        (new RemoveOldNotificationJob)->handle();

        expect(Notification::query()->pluck('id')->all())->toBe([$recent->id]);
    });
});
