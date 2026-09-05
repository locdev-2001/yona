<?php

use App\Jobs\Conversations\ReopenSnoozedConversationsJob;
use App\Models\Conversation;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Queue;

// Port từ spec/jobs/conversations/reopen_snoozed_conversations_job_spec.rb.

it('enqueues the job on the low queue', function () {
    Queue::fake();

    ReopenSnoozedConversationsJob::dispatch();

    Queue::assertPushedOn('low', ReopenSnoozedConversationsJob::class);
});

it('reopens snoozed conversations whose snooze until has passed', function () {
    $snoozedTillFiveMinutesAgo = Conversation::factory()->create(['status' => Conversation::STATUS_SNOOZED, 'snoozed_until' => now()->subMinutes(5)]);
    $snoozedTillTomorrow = Conversation::factory()->create(['status' => Conversation::STATUS_SNOOZED, 'snoozed_until' => now()->addDay()]);
    $snoozedIndefinitely = Conversation::factory()->create(['status' => Conversation::STATUS_SNOOZED]);

    (new ReopenSnoozedConversationsJob)->handle();

    expect($snoozedTillFiveMinutesAgo->fresh()->statusName())->toBe('open')
        ->and($snoozedTillTomorrow->fresh()->statusName())->toBe('snoozed')
        ->and($snoozedIndefinitely->fresh()->statusName())->toBe('snoozed');
});

it('is registered on the scheduler every 5 minutes like config/schedule.yml', function () {
    $events = collect(app(Schedule::class)->events())
        ->filter(fn ($event) => str_contains($event->description ?? '', ReopenSnoozedConversationsJob::class));

    expect($events)->toHaveCount(1)
        ->and($events->first()->expression)->toBe('*/5 * * * *');
});
