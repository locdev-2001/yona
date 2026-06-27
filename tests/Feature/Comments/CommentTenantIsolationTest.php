<?php

use Illuminate\Support\Facades\DB;
use Modules\Identity\Models\Team;
use Modules\Identity\Models\User;
use Modules\Shared\Models\Comment;
use Modules\Shared\Services\CommentService;
use Modules\Tenancy\Models\Workspace;

// Tenant isolation + portal visibility gate (G3) for comments.

it('scopes comment reads to the active workspace', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();

    actingInWorkspace($wsA);
    $teamA = Team::factory()->create();
    $service = app(CommentService::class);
    $service->add($teamA, 'Comment in A');
    $service->add($teamA, 'Comment in A 2');

    actingInWorkspace($wsB);
    expect(Comment::count())->toBe(0);
});

it('blocks raw query cross-workspace via RLS', function () {
    $wsA = Workspace::factory()->create();
    actingInWorkspace($wsA);
    $teamA = Team::factory()->create();
    $service = app(CommentService::class);
    $service->add($teamA, 'Private comment');

    clearWorkspaceContext();
    expect(DB::table('comments')->count())->toBe(0);
});

it('G3 visibleFor — staff sees all comments', function () {
    $wsA = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($wsA, $user, 'admin');
    actingInWorkspace($wsA, $user);

    $teamA = Team::factory()->create();
    $service = app(CommentService::class);
    $service->add($teamA, 'Public comment', null, true);
    $service->add($teamA, 'Private comment', null, false);

    // Staff (User actor) sees all 2 comments.
    $visible = $service->visibleFor($teamA, $user);
    expect($visible)->toHaveCount(2);
});

it('G3 visibleFor — null actor sees only visible_to_customer comments', function () {
    $wsA = Workspace::factory()->create();
    actingInWorkspace($wsA);
    $teamA = Team::factory()->create();

    $service = app(CommentService::class);
    $service->add($teamA, 'Public comment', null, true);
    $service->add($teamA, 'Private comment', null, false);

    // null actor (portal contact) sees only visible_to_customer=true.
    $visible = $service->visibleFor($teamA, null);
    expect($visible)->toHaveCount(1);
    expect($visible->first()->body)->toBe('Public comment');
});

it('stores reply with parent_id', function () {
    $wsA = Workspace::factory()->create();
    actingInWorkspace($wsA);
    $teamA = Team::factory()->create();

    $service = app(CommentService::class);
    $parent = $service->add($teamA, 'Parent comment');
    $reply = $service->add($teamA, 'Reply', $parent->id);

    expect($reply->parent_id)->toBe($parent->id);
    expect(Comment::whereNull('parent_id')->count())->toBe(1);
});
