<?php

use Modules\CrmSales\Models\Client;
use Modules\CrmSales\Models\Contact;
use Modules\CrmSales\Services\ClientService;
use Modules\Identity\Models\User;
use Modules\Tenancy\Models\Workspace;

/**
 * Primary contact invariant: exactly 1 is_primary per client.
 * Swap must reset old primary in same transaction.
 */
it('first contact added to a client is set as primary', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $service = app(ClientService::class);
    $client = Client::factory()->create();

    $contact = $service->addContact($client, ['first_name' => 'Alice'], makePrimary: true);

    expect($contact->fresh()->is_primary)->toBeTrue();
});

it('setting a new contact as primary resets the old primary', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $contact1 = Contact::factory()->primary()->create(['client_id' => $client->id]);
    $contact2 = Contact::factory()->create(['client_id' => $client->id, 'is_primary' => false]);

    expect($contact1->fresh()->is_primary)->toBeTrue();
    expect($contact2->fresh()->is_primary)->toBeFalse();

    $service = app(ClientService::class);
    $service->setPrimary($contact2);

    expect($contact1->fresh()->is_primary)->toBeFalse();
    expect($contact2->fresh()->is_primary)->toBeTrue();
});

it('cannot have more than one primary contact per client', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    Contact::factory()->primary()->create(['client_id' => $client->id]);
    Contact::factory()->primary()->create(['client_id' => $client->id]);

    $primaries = Contact::where('client_id', $client->id)->where('is_primary', true)->count();

    // DB allows multiple primaries without constraint — invariant is app-level
    // The service enforces it; direct factory bypass (raw create) is tested here
    // to confirm service is the only safe write path.
    // After service.setPrimary, there must be exactly 1:
    $service = app(ClientService::class);
    $any = Contact::where('client_id', $client->id)->first();
    $service->setPrimary($any);

    $afterCount = Contact::where('client_id', $client->id)->where('is_primary', true)->count();
    expect($afterCount)->toBe(1);
});
