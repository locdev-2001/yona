<?php

use App\Models\Client;
use App\Services\ClientService;
use Modules\Identity\Models\User;
use Modules\Tenancy\Models\Workspace;

/**
 * Customer-admin delegation tests.
 * G12 — user must be active WorkspaceMember to be assigned as customer-admin.
 */
it('can sync customer admins from workspace members', function () {
    $workspace = Workspace::factory()->create();
    $owner = User::factory()->create();
    $admin1 = User::factory()->create();
    $admin2 = User::factory()->create();

    actingInWorkspace($workspace, $owner);
    seedMember($workspace, $owner, 'admin');
    seedMember($workspace, $admin1, 'sales_rep');
    seedMember($workspace, $admin2, 'sales_rep');

    $client = Client::factory()->create();
    $service = app(ClientService::class);

    $service->syncCustomerAdmins($client, [$admin1->id, $admin2->id]);

    expect($client->customerAdmins()->count())->toBe(2);
});

it('rejects user outside workspace as customer admin (G12)', function () {
    $workspace = Workspace::factory()->create();
    $owner = User::factory()->create();
    $outsider = User::factory()->create(); // NOT a member

    actingInWorkspace($workspace, $owner);
    seedMember($workspace, $owner, 'admin');

    $client = Client::factory()->create();
    $service = app(ClientService::class);

    expect(fn () => $service->syncCustomerAdmins($client, [$outsider->id]))
        ->toThrow(InvalidArgumentException::class);
});

it('syncs customer admins idempotently', function () {
    $workspace = Workspace::factory()->create();
    $owner = User::factory()->create();
    $admin1 = User::factory()->create();

    actingInWorkspace($workspace, $owner);
    seedMember($workspace, $owner, 'admin');
    seedMember($workspace, $admin1, 'sales_rep');

    $client = Client::factory()->create();
    $service = app(ClientService::class);

    $service->syncCustomerAdmins($client, [$admin1->id]);
    $service->syncCustomerAdmins($client, [$admin1->id]); // idempotent

    expect($client->customerAdmins()->count())->toBe(1);
});

it('removes all customer admins when synced with empty array', function () {
    $workspace = Workspace::factory()->create();
    $owner = User::factory()->create();
    $admin1 = User::factory()->create();

    actingInWorkspace($workspace, $owner);
    seedMember($workspace, $owner, 'admin');
    seedMember($workspace, $admin1, 'sales_rep');

    $client = Client::factory()->create();
    $service = app(ClientService::class);

    $service->syncCustomerAdmins($client, [$admin1->id]);
    expect($client->customerAdmins()->count())->toBe(1);

    $service->syncCustomerAdmins($client, []);
    expect($client->customerAdmins()->count())->toBe(0);
});
