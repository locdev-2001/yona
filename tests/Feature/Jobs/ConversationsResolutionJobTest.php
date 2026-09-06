<?php

use App\Jobs\Account\ConversationsResolutionSchedulerJob;
use App\Jobs\Conversations\ResolutionJob;
use App\Models\Account;
use App\Models\Conversation;
use App\Models\Label;
use App\Models\Message;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Queue;

// Port từ spec/jobs/conversations/resolution_job_spec.rb +
// spec/jobs/account/conversations_resolution_scheduler_job_spec.rb.

function coldConversation(Account $account, array $attributes = []): Conversation
{
    // `waiting_since` được gán lúc tạo (before_create của bản gốc) nên phải ghi
    // đè sau khi hội thoại ra đời, giống spec Ruby.
    $conversation = Conversation::factory()->create(['account_id' => $account->id]);
    $conversation->update(['last_activity_at' => now()->subDays(13), 'waiting_since' => null, ...$attributes]);

    return $conversation;
}

it('enqueues the resolution job on the low queue', function () {
    Queue::fake();

    ResolutionJob::dispatch(Account::factory()->create());

    Queue::assertPushedOn('low', ResolutionJob::class);
});

it('resolves nothing when the account has no auto resolve duration', function () {
    $account = Account::factory()->create();
    $conversation = coldConversation($account);

    (new ResolutionJob($account))->handle();

    expect($conversation->fresh()->statusName())->toBe('open');
});

it('skips conversations waiting for an agent reply when ignore waiting is on', function () {
    $account = Account::factory()->create(['settings' => ['auto_resolve_after' => 14400, 'auto_resolve_ignore_waiting' => true]]);
    $waiting = coldConversation($account, ['waiting_since' => now()->subDays(13)]);
    $notWaiting = coldConversation($account);

    (new ResolutionJob($account))->handle();

    expect($waiting->fresh()->statusName())->toBe('open')
        ->and($notWaiting->fresh()->statusName())->toBe('resolved');
});

it('resolves waiting conversations too when ignore waiting is off', function () {
    $account = Account::factory()->create(['settings' => ['auto_resolve_after' => 14400, 'auto_resolve_ignore_waiting' => false]]);
    $waiting = coldConversation($account, ['waiting_since' => now()->subDays(13)]);
    $notWaiting = coldConversation($account);

    (new ResolutionJob($account))->handle();

    expect($waiting->fresh()->statusName())->toBe('resolved')
        ->and($notWaiting->fresh()->statusName())->toBe('resolved');
});

it('leaves conversations that are still active', function () {
    $account = Account::factory()->create(['settings' => ['auto_resolve_after' => 14400]]);
    $recent = coldConversation($account, ['last_activity_at' => now()->subMinutes(5)]);

    (new ResolutionJob($account))->handle();

    expect($recent->fresh()->statusName())->toBe('open');
});

it('skips orphan conversations without a contact', function () {
    $account = Account::factory()->create(['settings' => ['auto_resolve_after' => 14400]]);
    $orphan = coldConversation($account);
    $orphan->forceFill(['contact_id' => null, 'contact_inbox_id' => null])->saveQuietly();
    $resolvable = coldConversation($account);

    (new ResolutionJob($account))->handle();

    expect($orphan->fresh()->statusName())->toBe('open')
        ->and($resolvable->fresh()->statusName())->toBe('resolved');
});

it('adds the configured label after resolution', function () {
    $account = Account::factory()->create(['settings' => ['auto_resolve_after' => 14400, 'auto_resolve_label' => 'auto-resolved']]);
    Label::factory()->create(['account_id' => $account->id, 'title' => 'auto-resolved']);
    $conversation = coldConversation($account);

    (new ResolutionJob($account))->handle();

    expect($conversation->fresh()->statusName())->toBe('resolved')
        ->and($conversation->fresh()->labelList())->toContain('auto-resolved');
});

it('sends the auto resolve message before closing the conversation', function () {
    $account = Account::factory()->create([
        'settings' => ['auto_resolve_after' => 14400, 'auto_resolve_message' => 'Closing this for now.'],
    ]);
    $conversation = coldConversation($account);

    (new ResolutionJob($account))->handle();

    expect($conversation->messages()->template()->pluck('content')->all())->toContain('Closing this for now.');
});

it('writes the auto resolved activity message with the inactivity window', function () {
    $account = Account::factory()->create(['settings' => ['auto_resolve_after' => 14400]]);
    $conversation = coldConversation($account);

    (new ResolutionJob($account))->handle();

    expect($conversation->messages()->where('message_type', Message::TYPE_ACTIVITY)->pluck('content')->all())
        ->toContain('Conversation was marked resolved by system due to 10 days of inactivity');
});

it('resolves at most one batch in a single run', function () {
    config()->set('limits.bulk_actions', 2);
    $account = Account::factory()->create(['settings' => ['auto_resolve_after' => 14400]]);
    collect(range(1, 3))->each(fn () => coldConversation($account));

    (new ResolutionJob($account))->handle();

    expect($account->conversations()->where('status', Conversation::STATUS_RESOLVED)->count())->toBe(2);
});

it('enqueues the scheduler job on the scheduled jobs queue', function () {
    Queue::fake();

    ConversationsResolutionSchedulerJob::dispatch();

    Queue::assertPushedOn('scheduled_jobs', ConversationsResolutionSchedulerJob::class);
});

it('dispatches a resolution job only for accounts with auto resolve set', function () {
    Queue::fake();
    $withAutoResolve = Account::factory()->create(['settings' => ['auto_resolve_after' => 14400]]);
    Account::factory()->create();

    (new ConversationsResolutionSchedulerJob)->handle();

    Queue::assertPushed(ResolutionJob::class, 1);
    Queue::assertPushed(fn (ResolutionJob $job) => $job->account->is($withAutoResolve));
});

it('is registered on the scheduler every 5 minutes like config/schedule.yml', function () {
    $events = collect(app(Schedule::class)->events())
        ->filter(fn ($event) => str_contains($event->description ?? '', ConversationsResolutionSchedulerJob::class));

    expect($events)->toHaveCount(1)
        ->and($events->first()->expression)->toBe('*/5 * * * *');
});
