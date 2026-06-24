<?php

use App\Models\Attachment;
use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Support\Facades\DB;

// Tenant isolation for attachments (Layer 1 global scope + Layer 3 RLS).

it('scopes attachment reads to the active workspace', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();

    actingInWorkspace($wsA);
    $teamA = Team::factory()->create();
    Attachment::factory()->count(2)->create([
        'attachable_type' => 'team',
        'attachable_id' => $teamA->id,
    ]);

    actingInWorkspace($wsB);
    expect(Attachment::count())->toBe(0);

    actingInWorkspace($wsA);
    expect(Attachment::count())->toBe(2);
});

it('blocks raw query cross-workspace via RLS', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();

    actingInWorkspace($wsA);
    $teamA = Team::factory()->create();
    Attachment::factory()->create([
        'attachable_type' => 'team',
        'attachable_id' => $teamA->id,
    ]);

    setWorkspaceContext($wsB->id);
    expect(DB::table('attachments')->count())->toBe(0);

    clearWorkspaceContext();
    expect(DB::table('attachments')->count())->toBe(0);
});

it('auto-stamps workspace_id from the active workspace', function () {
    $wsA = Workspace::factory()->create();
    actingInWorkspace($wsA);
    $teamA = Team::factory()->create();

    $attachment = Attachment::factory()->create([
        'attachable_type' => 'team',
        'attachable_id' => $teamA->id,
    ]);

    expect($attachment->workspace_id)->toBe($wsA->id);
});

it('cannot resolve attachment from another workspace by id', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();

    actingInWorkspace($wsA);
    $teamA = Team::factory()->create();
    $attachment = Attachment::factory()->create([
        'attachable_type' => 'team',
        'attachable_id' => $teamA->id,
    ]);

    actingInWorkspace($wsB);
    expect(Attachment::find($attachment->id))->toBeNull();
    expect(Attachment::withoutGlobalScopes()->find($attachment->id))->toBeNull(); // RLS also denies
});

it('download by attachment_key from wrong workspace returns 404', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();

    $userA = User::factory()->create();
    seedMember($wsA, $userA, 'admin');

    $userB = User::factory()->create();
    seedMember($wsB, $userB, 'admin');

    actingInWorkspace($wsA);
    $teamA = Team::factory()->create();
    $attachment = Attachment::factory()->create([
        'attachable_type' => 'team',
        'attachable_id' => $teamA->id,
        'user_id' => $userA->id,
    ]);

    // WS-B user tries to download WS-A's attachment key — global scope hides it → 404.
    $this->actingAs($userB)
        ->withSession(['current_workspace_id' => $wsB->id])
        ->get(route('attachments.download', ['attachmentKey' => $attachment->attachment_key]))
        ->assertNotFound();
});
