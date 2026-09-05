<?php

use App\Jobs\AutoAssignment\AssignmentJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\User;
use App\Support\OnlineStatusTracker;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Redis;

// Port từ spec/jobs/auto_assignment/assignment_job_spec.rb.

beforeEach(function () {
    Redis::flushdb();

    $this->account = Account::factory()->create();
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id, 'enable_auto_assignment' => true]);
    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);
    $this->inbox->inboxMembers()->create(['user_id' => $this->agent->id]);
});

function inFlightKey(Inbox $inbox): string
{
    return sprintf(AssignmentJob::AUTO_ASSIGNMENT_IN_FLIGHT_KEY, $inbox->id);
}

it('assigns the inbox backlog through the service', function () {
    $conversation = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'status' => Conversation::STATUS_OPEN,
    ]);
    OnlineStatusTracker::updatePresence($this->account->id, 'User', $this->agent->id);
    OnlineStatusTracker::setStatus($this->account->id, $this->agent->id, 'online');

    (new AssignmentJob($this->inbox->id))->handle();

    expect($conversation->refresh()->assignee_id)->toBe($this->agent->id);
});

it('does nothing when the inbox no longer exists', function () {
    (new AssignmentJob(999999))->handle();
})->throwsNoExceptions();

it('runs on the default queue', function () {
    expect((new AssignmentJob($this->inbox->id))->queue)->toBe('default');
});

it('enqueues one run per inbox and coalesces the rest', function () {
    Queue::fake();

    expect(AssignmentJob::enqueueForInbox($this->inbox->id))->toBeTrue()
        ->and(AssignmentJob::enqueueForInbox($this->inbox->id))->toBeFalse();

    Queue::assertPushed(AssignmentJob::class, 1);
});

it('releases its own in-flight marker when the run ends', function () {
    Queue::fake();
    AssignmentJob::enqueueForInbox($this->inbox->id);
    $token = Redis::get(inFlightKey($this->inbox));

    (new AssignmentJob($this->inbox->id, $token))->handle();

    expect(Redis::get(inFlightKey($this->inbox)))->toBeNull()
        ->and(AssignmentJob::enqueueForInbox($this->inbox->id))->toBeTrue();
});

it('does not release a newer marker when its own token is stale', function () {
    Redis::setex(inFlightKey($this->inbox), 300, 'newer-token');

    (new AssignmentJob($this->inbox->id, 'stale-token'))->handle();

    expect(Redis::get(inFlightKey($this->inbox)))->toBe('newer-token');
});

it('claims the marker when a conversation opens on a v2 inbox', function () {
    Queue::fake();

    Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'status' => Conversation::STATUS_OPEN,
    ]);

    Queue::assertPushed(AssignmentJob::class, fn (AssignmentJob $job) => $job->inboxId === $this->inbox->id);
});
