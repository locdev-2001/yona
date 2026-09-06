<?php

use App\Finders\NotificationFinder;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\Notification;
use App\Models\User;

// Port từ spec/finders/notification_finder_spec.rb. Mỗi thông báo trỏ vào một
// hội thoại riêng vì RemoveDuplicateNotificationJob chỉ giữ bản mới nhất theo
// (user, hội thoại).

function createFinderNotification(Account $account, User $user, array $attributes = []): Notification
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

    createFinderNotification($this->account, $this->user, ['snoozed_until' => now()->addDay()]);
    createFinderNotification($this->account, $this->user, ['read_at' => now()]);
    createFinderNotification($this->account, $this->user, ['read_at' => now()]);
    foreach (range(1, 3) as $index) {
        createFinderNotification($this->account, $this->user, ['last_activity_at' => now()->subMinutes($index)]);
    }
});

it('returns unread and unsnoozed notifications newest first', function () {
    $notifications = (new NotificationFinder($this->user, $this->account))->notifications();

    $timestamps = $notifications->map(fn ($notification) => $notification->last_activity_at->getTimestamp())->all();

    expect($notifications)->toHaveCount(3)
        ->and($timestamps)->toBe(collect($timestamps)->sortDesc()->values()->all());
});

it('includes read and snoozed notifications when asked', function () {
    $finder = new NotificationFinder($this->user, $this->account, ['includes' => ['read', 'snoozed']]);

    expect($finder->notifications())->toHaveCount(6)
        ->and($finder->count())->toBe(6)
        ->and($finder->unreadCount())->toBe(4);
});

it('includes only read notifications when asked', function () {
    expect((new NotificationFinder($this->user, $this->account, ['includes' => ['read']]))->notifications())->toHaveCount(5);
});

it('includes only snoozed notifications when asked', function () {
    expect((new NotificationFinder($this->user, $this->account, ['includes' => ['snoozed']]))->notifications())->toHaveCount(4);
});

it('sorts ascending when asked', function () {
    $notifications = (new NotificationFinder($this->user, $this->account, ['sort_order' => 'asc']))->notifications();

    expect($notifications->first()->last_activity_at->lessThan($notifications->last()->last_activity_at))->toBeTrue();
});

it('reports unread and total counts without filters', function () {
    $finder = new NotificationFinder($this->user, $this->account);

    expect($finder->unreadCount())->toBe(3)
        ->and($finder->count())->toBe(3);
});

it('pages 15 notifications at a time', function () {
    foreach (range(1, 14) as $index) {
        createFinderNotification($this->account, $this->user, ['last_activity_at' => now()->subHours($index)]);
    }

    expect((new NotificationFinder($this->user, $this->account))->notifications())->toHaveCount(15)
        ->and((new NotificationFinder($this->user, $this->account, ['page' => 2]))->notifications())->toHaveCount(2);
});
