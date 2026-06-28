<?php

use App\Notifications\EntityNotification;
use App\Models\Team;
use App\Models\User;
use App\Services\NotificationService;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

// NotificationService: self-notify guard, inactive guard, mark-read ownership.

it('does not send notification to the acting user (self-notify guard)', function () {
    $ws = Workspace::factory()->create();
    $actor = User::factory()->create();
    seedMember($ws, $actor, 'admin');
    actingInWorkspace($ws, $actor);

    $team = Team::factory()->create();
    $notification = new EntityNotification('team.created', $team);

    app(NotificationService::class)->notify($actor, $notification);

    // Actor should NOT have received the notification
    expect($actor->notifications()->count())->toBe(0);
});

it('does not send notification to a deactivated member', function () {
    $ws = Workspace::factory()->create();
    $actor = User::factory()->create();
    $inactive = User::factory()->create();
    seedMember($ws, $actor, 'admin');

    // Add inactive member
    setWorkspaceContext($ws->id);
    $member = WorkspaceMember::factory()->for($ws)->create([
        'user_id' => $inactive->id,
        'role' => 'sales_rep',
        'status' => 'deactivated',
    ]);

    actingInWorkspace($ws, $actor);
    $team = Team::factory()->create();
    $notification = new EntityNotification('team.created', $team);

    app(NotificationService::class)->notify($inactive, $notification);

    expect($inactive->notifications()->count())->toBe(0);
});

it('sends notification to active recipient who is not the actor', function () {
    $ws = Workspace::factory()->create();
    $actor = User::factory()->create();
    $recipient = User::factory()->create();
    seedMember($ws, $actor, 'admin');
    seedMember($ws, $recipient, 'sales_rep');

    actingInWorkspace($ws, $actor);
    $team = Team::factory()->create();
    $notification = new EntityNotification('team.created', $team);

    app(NotificationService::class)->notify($recipient, $notification);

    expect($recipient->notifications()->count())->toBe(1);
});

it('unread count returns correct number', function () {
    $ws = Workspace::factory()->create();
    $actor = User::factory()->create();
    $recipient = User::factory()->create();
    seedMember($ws, $actor, 'admin');
    seedMember($ws, $recipient, 'sales_rep');

    actingInWorkspace($ws, $actor);
    $team = Team::factory()->create();
    $service = app(NotificationService::class);

    $service->notify($recipient, new EntityNotification('team.created', $team));
    $service->notify($recipient, new EntityNotification('team.updated', $team));

    expect($service->unreadCount($recipient))->toBe(2);
});

it('markRead returns 404 when notification belongs to different user', function () {
    $ws = Workspace::factory()->create();
    $actor = User::factory()->create();
    $recipient = User::factory()->create();
    $other = User::factory()->create();
    seedMember($ws, $actor, 'admin');
    seedMember($ws, $recipient, 'sales_rep');
    seedMember($ws, $other, 'sales_rep');

    actingInWorkspace($ws, $actor);
    $team = Team::factory()->create();
    app(NotificationService::class)->notify($recipient, new EntityNotification('team.created', $team));

    $notificationId = $recipient->notifications()->first()->id;

    // Other user tries to mark recipient's notification — should 404
    expect(fn () => app(NotificationService::class)->markRead($other, $notificationId))
        ->toThrow(NotFoundHttpException::class);
});

it('markAllRead marks all unread as read', function () {
    $ws = Workspace::factory()->create();
    $actor = User::factory()->create();
    $recipient = User::factory()->create();
    seedMember($ws, $actor, 'admin');
    seedMember($ws, $recipient, 'sales_rep');

    actingInWorkspace($ws, $actor);
    $team = Team::factory()->create();
    $service = app(NotificationService::class);

    $service->notify($recipient, new EntityNotification('team.created', $team));
    $service->notify($recipient, new EntityNotification('team.updated', $team));

    expect($service->unreadCount($recipient))->toBe(2);

    $service->markAllRead($recipient);

    expect($service->unreadCount($recipient))->toBe(0);
});
