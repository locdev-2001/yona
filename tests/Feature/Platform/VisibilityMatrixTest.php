<?php

use Modules\Identity\Models\User;
use Modules\Identity\Services\TeamService;
use Modules\Identity\Support\Visibility;
use Modules\Tenancy\Models\Workspace;
use Modules\Tenancy\Models\WorkspaceMember;

// Record gate (BR-X02): own | team-subtree | all. The full owner_id matrix is
// exercised on Sales entities later; here we prove the building blocks — closure
// subtree resolution, role→level mapping, and scope clause generation — plus a
// real executed team-scope against workspace_member (which carries team_id).

beforeEach(function () {
    $this->ws = Workspace::factory()->create();
    actingInWorkspace($this->ws);

    $svc = app(TeamService::class);
    $this->root = $svc->create('Root');
    $this->childA = $svc->create('Child A', $this->root->id);
    $this->grand = $svc->create('Grandchild', $this->childA->id);
    $this->childB = $svc->create('Child B', $this->root->id);
});

it('resolves the full subtree for a top-level team', function () {
    $manager = WorkspaceMember::factory()->for($this->ws)->role('sales_manager')
        ->create(['team_id' => $this->root->id, 'user_id' => User::factory()]);

    expect(Visibility::visibleTeamIds($manager))->toEqualCanonicalizing([
        $this->root->id, $this->childA->id, $this->grand->id, $this->childB->id,
    ]);
});

it('scopes a manager to their own subtree only', function () {
    $manager = WorkspaceMember::factory()->for($this->ws)->role('sales_manager')
        ->create(['team_id' => $this->childA->id, 'user_id' => User::factory()]);

    expect(Visibility::visibleTeamIds($manager))->toEqualCanonicalizing([
        $this->childA->id, $this->grand->id,
    ]);
});

it('maps each role to its visibility level', function () {
    $member = fn (string $role) => WorkspaceMember::factory()->for($this->ws)->role($role)->create(['user_id' => User::factory()]);

    expect(Visibility::level($member('admin')))->toBe('all')
        ->and(Visibility::level($member('sales_manager')))->toBe('team')
        ->and(Visibility::level($member('support_manager')))->toBe('team')
        ->and(Visibility::level($member('sales_rep')))->toBe('own')
        ->and(Visibility::level($member('viewer')))->toBe('own');
});

it('generates the correct scope clause per level', function () {
    $rep = WorkspaceMember::factory()->for($this->ws)->role('sales_rep')->create(['user_id' => User::factory()]);
    $manager = WorkspaceMember::factory()->for($this->ws)->role('sales_manager')->create(['team_id' => $this->childA->id, 'user_id' => User::factory()]);
    $admin = WorkspaceMember::factory()->for($this->ws)->admin()->create(['user_id' => User::factory()]);

    expect(Visibility::scopeFor(WorkspaceMember::query(), $rep)->toSql())->toContain('owner_id')
        ->and(Visibility::scopeFor(WorkspaceMember::query(), $manager)->toSql())->toContain('team_id')
        ->and(Visibility::scopeFor(WorkspaceMember::query(), $admin)->toSql())->not->toContain('owner_id');
});

it('returns only subtree members for a team-scoped query', function () {
    WorkspaceMember::factory()->for($this->ws)->create(['team_id' => $this->childA->id, 'user_id' => User::factory()]);
    WorkspaceMember::factory()->for($this->ws)->create(['team_id' => $this->grand->id, 'user_id' => User::factory()]);
    WorkspaceMember::factory()->for($this->ws)->create(['team_id' => $this->childB->id, 'user_id' => User::factory()]);

    $manager = WorkspaceMember::factory()->for($this->ws)->role('sales_manager')
        ->create(['team_id' => $this->childA->id, 'user_id' => User::factory()]);

    $visibleTeamIds = Visibility::scopeFor(WorkspaceMember::query(), $manager)->pluck('team_id')->filter()->unique()->all();

    expect($visibleTeamIds)->toContain($this->childA->id, $this->grand->id)
        ->not->toContain($this->childB->id);
});
