<?php

use App\Exceptions\TeamHierarchyException;
use App\Models\Team;
use App\Models\TeamClosure;
use App\Models\User;
use Modules\Tenancy\Models\Workspace;
use Modules\Tenancy\Models\WorkspaceMember;
use App\Services\TeamService;

// Team-tree integrity + closure maintenance (BR-X02/X13).

beforeEach(function () {
    $this->ws = Workspace::factory()->create();
    actingInWorkspace($this->ws);
    $this->svc = app(TeamService::class);
});

it('writes closure rows on create (self + inherited ancestors)', function () {
    $root = $this->svc->create('Root');
    $child = $this->svc->create('Child', $root->id);

    $exists = fn ($a, $d, $depth) => TeamClosure::where('ancestor_id', $a)->where('descendant_id', $d)->where('depth', $depth)->exists();

    expect($exists($root->id, $root->id, 0))->toBeTrue()
        ->and($exists($child->id, $child->id, 0))->toBeTrue()
        ->and($exists($root->id, $child->id, 1))->toBeTrue();
});

it('rejects reparenting a team under itself or a descendant (cycle guard)', function () {
    $root = $this->svc->create('Root');
    $child = $this->svc->create('Child', $root->id);

    expect(fn () => $this->svc->reparent($root, $child->id))->toThrow(TeamHierarchyException::class)
        ->and(fn () => $this->svc->reparent($root, $root->id))->toThrow(TeamHierarchyException::class);
});

it('rebuilds closure depths on a valid reparent', function () {
    $root = $this->svc->create('Root');
    $a = $this->svc->create('A', $root->id);
    $b = $this->svc->create('B', $root->id);
    $leaf = $this->svc->create('Leaf', $a->id); // root → a → leaf

    $this->svc->reparent($a, $b->id); // → root → b → a → leaf

    $exists = fn ($anc, $desc, $depth) => TeamClosure::where('ancestor_id', $anc)->where('descendant_id', $desc)->where('depth', $depth)->exists();

    expect($a->fresh()->parent_id)->toBe($b->id)
        ->and($exists($b->id, $a->id, 1))->toBeTrue()
        ->and($exists($root->id, $a->id, 2))->toBeTrue()
        ->and($exists($root->id, $leaf->id, 3))->toBeTrue()
        ->and($exists($a->id, $leaf->id, 1))->toBeTrue(); // internal link preserved
});

it('moves a subtree to the root', function () {
    $root = $this->svc->create('Root');
    $a = $this->svc->create('A', $root->id);

    $this->svc->reparent($a, null);

    expect($a->fresh()->parent_id)->toBeNull()
        ->and(TeamClosure::where('ancestor_id', $root->id)->where('descendant_id', $a->id)->exists())->toBeFalse()
        ->and(TeamClosure::where('ancestor_id', $a->id)->where('descendant_id', $a->id)->where('depth', 0)->exists())->toBeTrue();
});

it('blocks deleting a team that still has children', function () {
    $root = $this->svc->create('Root');
    $this->svc->create('Child', $root->id);

    expect(fn () => $this->svc->delete($root))->toThrow(TeamHierarchyException::class);
});

it('soft-deletes a leaf team and detaches its members', function () {
    $leaf = $this->svc->create('Leaf');
    $member = WorkspaceMember::factory()->for($this->ws)->create(['team_id' => $leaf->id, 'user_id' => User::factory()]);

    $this->svc->delete($leaf);

    expect(Team::withTrashed()->find($leaf->id)->trashed())->toBeTrue()
        ->and($member->fresh()->team_id)->toBeNull();
});
