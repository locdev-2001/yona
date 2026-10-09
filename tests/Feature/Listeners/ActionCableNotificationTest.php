<?php

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Jobs\ActionCableBroadcastJob;
use App\Listeners\ActionCableListener;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Queue;

// Port từ nhánh notification_* của spec/listeners/action_cable_listener_spec.rb.

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $this->inbox->addMembers([$this->agent->id]);
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
    ]);
    $this->notification = Notification::factory()->create([
        'account_id' => $this->account->id,
        'user_id' => $this->agent->id,
        'primary_actor_id' => $this->conversation->id,
    ]);
});

function fireNotificationBroadcast(EventType $type, array $data): ActionCableBroadcastJob
{
    Queue::fake();
    app(ActionCableListener::class)->handle(new DomainEvent($type, $data));

    $jobs = Queue::pushedJobs()[ActionCableBroadcastJob::class] ?? [];
    expect($jobs)->toHaveCount(1);

    return $jobs[0]['job'];
}

it('broadcasts notification.created only to the notified user', function () {
    $job = fireNotificationBroadcast(EventType::NOTIFICATION_CREATED, ['notification' => $this->notification]);

    expect($job->members)->toBe([$this->agent->pubsub_token])
        ->and($job->eventName)->toBe('notification.created')
        ->and($job->data['notification']['id'])->toBe($this->notification->id)
        ->and($job->data['unread_count'])->toBe(1)
        ->and((array) $job->data['unread_inbox_counts'])->toEqual([(string) $this->notification->primaryActor->inbox_id => 1])
        ->and($job->data['count'])->toBe(1)
        ->and($job->queue)->toBe('critical');
});

it('broadcasts notification.updated with the refreshed counters', function () {
    $this->notification->update(['read_at' => now()]);

    $job = fireNotificationBroadcast(EventType::NOTIFICATION_UPDATED, ['notification' => $this->notification->fresh()]);

    expect($job->eventName)->toBe('notification.updated')
        ->and($job->data['unread_count'])->toBe(0)
        ->and($job->data['count'])->toBe(0);
});

it('broadcasts notification.deleted with just the id', function () {
    $notificationId = $this->notification->id;
    $this->notification->delete();

    $job = fireNotificationBroadcast(EventType::NOTIFICATION_DELETED, [
        'notification_data' => [
            'id' => $notificationId,
            'user_id' => $this->agent->id,
            'account_id' => $this->account->id,
        ],
    ]);

    expect($job->members)->toBe([$this->agent->pubsub_token])
        ->and($job->eventName)->toBe('notification.deleted')
        ->and($job->data['notification'])->toBe(['id' => $notificationId])
        ->and($job->data['unread_count'])->toBe(0);
});

it('does nothing when the deleted notification points at a missing user', function () {
    Queue::fake();

    app(ActionCableListener::class)->handle(new DomainEvent(EventType::NOTIFICATION_DELETED, [
        'notification_data' => ['id' => 1, 'user_id' => 0, 'account_id' => $this->account->id],
    ]));

    Queue::assertNotPushed(ActionCableBroadcastJob::class);
});
