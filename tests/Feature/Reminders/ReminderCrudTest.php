<?php

use App\Models\Reminder;
use Modules\Identity\Models\Team;
use Modules\Identity\Models\User;
use Modules\Tenancy\Models\Workspace;
use App\Services\ReminderService;

// Reminder CRUD authz matrix + service behavior.

it('member can create a reminder via route', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    $recipient = User::factory()->create();
    seedMember($ws, $user, 'sales_rep');
    seedMember($ws, $recipient, 'sales_rep');
    actingInWorkspace($ws);

    $team = Team::factory()->create();

    $this->actingAs($user)
        ->withSession(['current_workspace_id' => $ws->id])
        ->post(route('reminders.store'), [
            'remindable_type' => 'team',
            'remindable_id' => $team->id,
            'user_id' => $recipient->id,
            'description' => 'Follow up on this team.',
            'remind_at' => now()->addDay()->toDateTimeString(),
        ])
        ->assertRedirect();

    actingInWorkspace($ws);
    expect(Reminder::where('description', 'Follow up on this team.')->exists())->toBeTrue();
});

it('guest cannot create a reminder (401)', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);
    $team = Team::factory()->create();

    $this->post(route('reminders.store'), [
        'remindable_type' => 'team',
        'remindable_id' => $team->id,
        'user_id' => 1,
        'description' => 'Test',
        'remind_at' => now()->addDay()->toDateTimeString(),
    ])->assertRedirect(route('login'));
});

it('creator can delete their own reminder', function () {
    $ws = Workspace::factory()->create();
    $creator = User::factory()->create();
    $recipient = User::factory()->create();
    seedMember($ws, $creator, 'sales_rep');
    seedMember($ws, $recipient, 'sales_rep');
    actingInWorkspace($ws, $creator);

    $team = Team::factory()->create();
    $service = app(ReminderService::class);
    $reminder = $service->create($team, $recipient, now()->addHour(), 'Check in');
    $reminder->created_by = $creator->id;
    $reminder->saveQuietly();

    $this->actingAs($creator)
        ->withSession(['current_workspace_id' => $ws->id])
        ->delete(route('reminders.destroy', $reminder->id))
        ->assertRedirect();

    actingInWorkspace($ws);
    expect(Reminder::find($reminder->id))->toBeNull();
});

it('recipient can delete the reminder targeted at them', function () {
    $ws = Workspace::factory()->create();
    $creator = User::factory()->create();
    $recipient = User::factory()->create();
    seedMember($ws, $creator, 'admin');
    seedMember($ws, $recipient, 'sales_rep');
    actingInWorkspace($ws, $creator);

    $team = Team::factory()->create();
    $service = app(ReminderService::class);
    $reminder = $service->create($team, $recipient, now()->addHour(), 'Check in');

    // Recipient deletes their own reminder
    actingInWorkspace($ws, $recipient);
    $this->actingAs($recipient)
        ->withSession(['current_workspace_id' => $ws->id])
        ->delete(route('reminders.destroy', $reminder->id))
        ->assertRedirect();
});

it('other member cannot delete a reminder (403 or 404)', function () {
    $ws = Workspace::factory()->create();
    $creator = User::factory()->create();
    $recipient = User::factory()->create();
    $outsider = User::factory()->create();
    seedMember($ws, $creator, 'sales_rep');
    seedMember($ws, $recipient, 'sales_rep');
    seedMember($ws, $outsider, 'sales_rep');
    actingInWorkspace($ws, $creator);

    $team = Team::factory()->create();
    $service = app(ReminderService::class);
    $reminder = $service->create($team, $recipient, now()->addHour(), 'Check in');
    $reminder->created_by = $creator->id;
    $reminder->saveQuietly();

    $this->actingAs($outsider)
        ->withSession(['current_workspace_id' => $ws->id])
        ->delete(route('reminders.destroy', $reminder->id))
        ->assertForbidden();
});

it('reminder from different workspace returns 404 on delete (non-enumeration)', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();

    $userA = User::factory()->create();
    $userB = User::factory()->create();
    seedMember($wsA, $userA, 'admin');
    seedMember($wsB, $userB, 'admin');

    actingInWorkspace($wsA, $userA);
    $teamA = Team::factory()->create();
    $service = app(ReminderService::class);
    $reminder = $service->create($teamA, $userA, now()->addHour(), 'WS-A reminder');

    // WS-B user tries to delete WS-A reminder
    $this->actingAs($userB)
        ->withSession(['current_workspace_id' => $wsB->id])
        ->delete(route('reminders.destroy', $reminder->id))
        ->assertNotFound();
});
