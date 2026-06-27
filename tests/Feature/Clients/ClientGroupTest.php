<?php

use App\Models\Client;
use App\Models\ClientGroup;
use App\Models\User;
use Modules\Tenancy\Models\Workspace;
use App\Services\ClientService;
use Illuminate\Database\QueryException;

it('creates a client group', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $group = ClientGroup::factory()->create(['name' => 'VIP']);

    expect($group->id)->not->toBeNull();
    expect($group->workspace_id)->toBe($workspace->id);
    expect($group->name)->toBe('VIP');
});

it('assigns and removes groups from a client', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $group = ClientGroup::factory()->create();

    $service = app(ClientService::class);
    $service->syncGroups($client, [$group->id]);

    expect($client->groups()->pluck('client_groups.id')->contains($group->id))->toBeTrue();

    $service->syncGroups($client, []);
    expect($client->groups()->count())->toBe(0);
});

it('group slugs are unique per workspace', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();
    $userA = User::factory()->create();

    actingInWorkspace($wsA, $userA);
    seedMember($wsA, $userA, 'admin');
    $groupA = ClientGroup::factory()->create(['slug' => 'vip-group']);

    clearWorkspaceContext();
    $userB = User::factory()->create();
    actingInWorkspace($wsB, $userB);
    seedMember($wsB, $userB, 'admin');

    // Same slug in different workspace should be OK
    $groupB = ClientGroup::factory()->create(['slug' => 'vip-group']);
    expect($groupB->id)->not->toBeNull();
});

it('duplicate slug in same workspace throws', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    ClientGroup::factory()->create(['slug' => 'dup-slug']);

    expect(fn () => ClientGroup::factory()->create(['slug' => 'dup-slug']))
        ->toThrow(QueryException::class);
});
