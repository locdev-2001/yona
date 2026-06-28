<?php

use Illuminate\Support\Facades\DB;
use App\Models\Team;
use App\Models\User;
use App\Services\ReminderService;
use App\Models\Workspace;

// G12 scheduler isolation: 2-workspace due reminders dispatched with no cross-workspace leak.
//
// NOTE: dispatchDue() accepts an optional $workspaceIds parameter so tests can bypass
// the privileged-connection snapshot. In production the param is null and the privileged
// connection reads across all workspaces. In tests we pass workspace IDs explicitly because
// Postgres READ COMMITTED isolation means uncommitted rows on connection A are invisible to
// connection B (even in the same test run).

it('dispatcher fires notifications only for the correct workspace recipient', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();

    $recipientA = User::factory()->create();
    $recipientB = User::factory()->create();
    seedMember($wsA, $recipientA, 'sales_rep');
    seedMember($wsB, $recipientB, 'sales_rep');

    // Create due reminder in WS-A
    actingInWorkspace($wsA, $recipientA);
    $teamA = Team::factory()->create();
    $service = app(ReminderService::class);
    $service->create($teamA, $recipientA, now()->subMinute(), 'WS-A reminder');

    // Create due reminder in WS-B
    actingInWorkspace($wsB, $recipientB);
    $teamB = Team::factory()->create();
    $service->create($teamB, $recipientB, now()->subMinute(), 'WS-B reminder');

    // Clear context before running scheduler (simulates CLI environment)
    clearWorkspaceContext();

    // Pass workspace IDs explicitly (bypasses privileged-connection snapshot in tests)
    $dispatched = $service->dispatchDue([$wsA->id, $wsB->id]);

    expect($dispatched)->toBe(2);

    // Each recipient gets exactly 1 notification (their own workspace's reminder)
    expect($recipientA->notifications()->count())->toBe(1);
    expect($recipientB->notifications()->count())->toBe(1);

    // Recipient A's notification is about their reminder, not WS-B's
    $notifDataA = $recipientA->notifications()->first()->data;
    expect($notifDataA['payload']['description'] ?? '')->toBe('WS-A reminder');

    // Recipient B's notification is about their reminder, not WS-A's
    $notifDataB = $recipientB->notifications()->first()->data;
    expect($notifDataB['payload']['description'] ?? '')->toBe('WS-B reminder');
});

it('dispatcher sets is_notified=true after firing', function () {
    $ws = Workspace::factory()->create();
    $recipient = User::factory()->create();
    seedMember($ws, $recipient, 'sales_rep');
    actingInWorkspace($ws, $recipient);

    $team = Team::factory()->create();
    $service = app(ReminderService::class);
    $reminder = $service->create($team, $recipient, now()->subMinute(), 'Check');

    clearWorkspaceContext();
    $service->dispatchDue([$ws->id]);

    // Re-establish context to load the reminder (BelongsToWorkspace global scope)
    actingInWorkspace($ws);
    $reminder->refresh();
    expect($reminder->is_notified)->toBeTrue()
        ->and($reminder->notified_at)->not->toBeNull();
});

it('dispatcher does not re-fire already-notified reminders', function () {
    $ws = Workspace::factory()->create();
    $recipient = User::factory()->create();
    seedMember($ws, $recipient, 'sales_rep');
    actingInWorkspace($ws, $recipient);

    $team = Team::factory()->create();
    $service = app(ReminderService::class);
    $service->create($team, $recipient, now()->subMinute(), 'Once only');

    clearWorkspaceContext();
    $service->dispatchDue([$ws->id]); // first run
    $service->dispatchDue([$ws->id]); // second run — should not re-fire

    expect($recipient->notifications()->count())->toBe(1);
});

it('context is reset to empty after dispatchDue completes (G12)', function () {
    $ws = Workspace::factory()->create();
    $recipient = User::factory()->create();
    seedMember($ws, $recipient, 'sales_rep');
    actingInWorkspace($ws, $recipient);

    $team = Team::factory()->create();
    $service = app(ReminderService::class);
    $service->create($team, $recipient, now()->subMinute(), 'Test');

    clearWorkspaceContext();
    $service->dispatchDue([$ws->id]);

    // After dispatch, context should be cleared (no cross-workspace leak)
    $setting = DB::selectOne("select current_setting('app.current_workspace', true) as val")?->val;
    expect($setting)->toBeEmpty('Workspace context must be reset after dispatchDue');
    expect(currentWorkspace())->toBeNull('app container must not retain workspace instance');
});

it('future reminder is not dispatched', function () {
    $ws = Workspace::factory()->create();
    $recipient = User::factory()->create();
    seedMember($ws, $recipient, 'sales_rep');
    actingInWorkspace($ws, $recipient);

    $team = Team::factory()->create();
    $service = app(ReminderService::class);
    $service->create($team, $recipient, now()->addHour(), 'Future');

    clearWorkspaceContext();
    $dispatched = $service->dispatchDue([$ws->id]);

    expect($dispatched)->toBe(0);
    expect($recipient->notifications()->count())->toBe(0);
});
