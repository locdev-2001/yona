<?php

use App\Models\Client;
use App\Models\ProjectDiscussion;
use App\Models\User;
use App\Models\Workspace;
use App\Services\ProjectDiscussionService;
use App\Services\ProjectService;

// P08 — Discussion thread + reply via HasComments (P03).

it('opens a discussion thread on a project', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $project = app(ProjectService::class)->create(['name' => 'Discussion Project', 'client_id' => $client->id], $user->id);

    $discussion = app(ProjectDiscussionService::class)->open(
        $project,
        ['subject' => 'Design Review', 'body' => 'Let us review the mockups.', 'show_to_customer' => false],
        $user->id
    );

    expect($discussion->id)->not->toBeNull();
    expect($discussion->project_id)->toBe($project->id);
    expect($discussion->subject)->toBe('Design Review');
    expect($discussion->workspace_id)->toBe($workspace->id);
});

it('adds a reply to a discussion via HasComments (project_discussion morph alias)', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $project = app(ProjectService::class)->create(['name' => 'Reply Project', 'client_id' => $client->id], $user->id);

    $discussion = app(ProjectDiscussionService::class)->open(
        $project,
        ['subject' => 'Tech Decisions', 'body' => null, 'show_to_customer' => false],
        $user->id
    );

    $reply = app(ProjectDiscussionService::class)->reply($discussion, ['body' => 'Agreed!', 'parent_id' => null], $user->id);

    expect($reply->id)->not->toBeNull();
    expect($reply->commentable_type)->toBe('project_discussion'); // G3 alias
    expect($reply->commentable_id)->toBe($discussion->id);
    expect($reply->body)->toBe('Agreed!');
});

it('discussion morph type uses alias not FQCN (G3)', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $project = app(ProjectService::class)->create(['name' => 'Morph Test', 'client_id' => $client->id], $user->id);
    $discussion = ProjectDiscussion::factory()->create([
        'project_id' => $project->id,
        'workspace_id' => $workspace->id,
    ]);

    // MorphClass must resolve to alias 'project_discussion', not FQCN
    expect($discussion->getMorphClass())->toBe('project_discussion');
});
