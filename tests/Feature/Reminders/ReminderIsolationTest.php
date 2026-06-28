<?php

use App\Models\Reminder;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\Services\ReminderService;
use Illuminate\Support\Facades\DB;

// Tenant isolation: WS-B must NOT see reminders belonging to WS-A.

it('workspace B cannot read workspace A reminders via eloquent', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();

    $userA = User::factory()->create();
    $userB = User::factory()->create();
    seedMember($wsA, $userA, 'admin');
    seedMember($wsB, $userB, 'admin');

    actingInWorkspace($wsA, $userA);
    $teamA = Team::factory()->create();
    $service = app(ReminderService::class);
    $service->create($teamA, $userA, now()->addHour(), 'WS-A reminder');

    actingInWorkspace($wsB);
    expect(Reminder::count())->toBe(0);
});

it('workspace B cannot read workspace A reminders via raw SQL (RLS layer 3)', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();

    $userA = User::factory()->create();
    seedMember($wsA, $userA, 'admin');

    actingInWorkspace($wsA, $userA);
    $teamA = Team::factory()->create();
    $service = app(ReminderService::class);
    $service->create($teamA, $userA, now()->addHour(), 'WS-A reminder');

    setWorkspaceContext($wsB->id);
    $count = DB::table('reminders')->count();

    expect($count)->toBe(0, 'RLS must prevent WS-B from seeing WS-A reminders');
});

it('active workspace sees only its own reminders', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();

    $userA = User::factory()->create();
    $userB = User::factory()->create();
    seedMember($wsA, $userA, 'admin');
    seedMember($wsB, $userB, 'admin');

    $service = app(ReminderService::class);

    actingInWorkspace($wsA, $userA);
    $teamA = Team::factory()->create();
    $service->create($teamA, $userA, now()->addHour(), 'R1');
    $service->create($teamA, $userA, now()->addDay(), 'R2');

    actingInWorkspace($wsB, $userB);
    $teamB = Team::factory()->create();
    $service->create($teamB, $userB, now()->addHour(), 'R3');

    expect(Reminder::count())->toBe(1); // WS-B sees only its 1 reminder

    actingInWorkspace($wsA);
    expect(Reminder::count())->toBe(2); // WS-A sees its 2 reminders
});
