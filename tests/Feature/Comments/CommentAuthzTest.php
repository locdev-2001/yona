<?php

use App\Models\Comment;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\Services\CommentService;

// Authz matrix for CommentController.

it('guest cannot post a comment (401)', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);
    $team = Team::factory()->create();

    $this->post(route('comments.store'), [
        'commentable_type' => 'team',
        'commentable_id' => $team->id,
        'body' => 'Hello',
    ])->assertRedirect(route('login'));
});

it('authenticated member can post a comment', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'sales_rep');

    actingInWorkspace($ws);
    $team = Team::factory()->create();

    $this->actingAs($user)
        ->withSession(['current_workspace_id' => $ws->id])
        ->post(route('comments.store'), [
            'commentable_type' => 'team',
            'commentable_id' => $team->id,
            'body' => 'Hello from member',
        ])
        ->assertRedirect();

    actingInWorkspace($ws);
    expect(Comment::where('body', 'Hello from member')->exists())->toBeTrue();
});

it('non-author cannot delete another member\'s comment (403)', function () {
    $ws = Workspace::factory()->create();
    $author = User::factory()->create();
    $other = User::factory()->create();
    seedMember($ws, $author, 'sales_rep');
    seedMember($ws, $other, 'sales_rep');

    actingInWorkspace($ws);
    $team = Team::factory()->create();
    $service = app(CommentService::class);
    $comment = $service->add($team, 'Author comment');
    $comment->user_id = $author->id;
    $comment->saveQuietly();

    $this->actingAs($other)
        ->withSession(['current_workspace_id' => $ws->id])
        ->delete(route('comments.destroy', $comment->id))
        ->assertForbidden();
});

it('author can delete their own comment', function () {
    $ws = Workspace::factory()->create();
    $author = User::factory()->create();
    seedMember($ws, $author, 'sales_rep');

    actingInWorkspace($ws, $author);
    $team = Team::factory()->create();
    $service = app(CommentService::class);
    $comment = $service->add($team, 'My comment');

    $this->actingAs($author)
        ->withSession(['current_workspace_id' => $ws->id])
        ->delete(route('comments.destroy', $comment->id))
        ->assertRedirect();

    actingInWorkspace($ws);
    expect(Comment::find($comment->id))->toBeNull();
});

it('comment id from different workspace returns 404', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();

    $userA = User::factory()->create();
    $userB = User::factory()->create();
    seedMember($wsA, $userA, 'admin');
    seedMember($wsB, $userB, 'admin');

    actingInWorkspace($wsA);
    $teamA = Team::factory()->create();
    $service = app(CommentService::class);
    $comment = $service->add($teamA, 'WS-A comment');

    // WS-B user tries to delete WS-A comment by id — global scope hides it → 404.
    $this->actingAs($userB)
        ->withSession(['current_workspace_id' => $wsB->id])
        ->delete(route('comments.destroy', $comment->id))
        ->assertNotFound();
});
