<?php

use App\Models\Client;
use App\Models\ClientGroup;
use App\Models\Contact;
use Modules\Identity\Models\User;
use Modules\Tenancy\Models\Workspace;
use App\Services\ClientService;

// ── CRUD happy paths ──────────────────────────────────────────────────────────

it('creates a client via service', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $service = app(ClientService::class);

    $client = $service->create(['name' => 'ACME Corp', 'currency' => 'VND']);

    expect($client->id)->not->toBeNull();
    expect($client->name)->toBe('ACME Corp');
    expect($client->workspace_id)->toBe($workspace->id);
    expect($client->owner_id)->toBe($user->id);
});

it('creates a client with a primary contact', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $service = app(ClientService::class);

    $client = $service->create(
        clientData: ['name' => 'Test Co'],
        primaryContactData: ['first_name' => 'Alice', 'last_name' => 'Smith', 'email' => 'alice@example.com'],
    );

    expect($client->contacts()->count())->toBe(1);
    expect($client->primaryContact)->not->toBeNull();
    expect($client->primaryContact->first_name)->toBe('Alice');
    expect($client->primaryContact->is_primary)->toBeTrue();
});

it('updates a client', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create(['name' => 'Old Name']);

    $service = app(ClientService::class);
    $service->update($client, ['name' => 'New Name']);

    expect($client->fresh()->name)->toBe('New Name');
});

it('soft-deletes a client', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $clientId = $client->id;

    $service = app(ClientService::class);
    $service->delete($client);

    expect(Client::find($clientId))->toBeNull();
    expect(Client::withTrashed()->find($clientId))->not->toBeNull();
});

it('adds a contact to a client', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $service = app(ClientService::class);

    $contact = $service->addContact($client, ['first_name' => 'Bob', 'email' => 'bob@example.com']);

    expect($contact->id)->not->toBeNull();
    expect($contact->client_id)->toBe($client->id);
    expect($contact->is_primary)->toBeFalse();
});

// ── Index route ───────────────────────────────────────────────────────────────

it('index page returns 200 for admin', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $this->actingAs($user)
        ->get(route('clients.index'))
        ->assertStatus(200);
});

it('guests get 302 redirect on clients index', function () {
    $this->get(route('clients.index'))->assertRedirect('/login');
});

// ── Delete contact ────────────────────────────────────────────────────────────

it('soft-deletes a contact', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $contact = Contact::factory()->create(['client_id' => $client->id]);
    $contactId = $contact->id;

    $service = app(ClientService::class);
    $service->deleteContact($contact);

    expect(Contact::find($contactId))->toBeNull();
    expect(Contact::withTrashed()->find($contactId))->not->toBeNull();
});

// ── Authz matrix ─────────────────────────────────────────────────────────────

it('returns 302 for unauthenticated client show', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    $client = Client::factory()->create();
    clearWorkspaceContext();

    $this->get(route('clients.show', $client))->assertRedirect();
});

// ── Group sync ────────────────────────────────────────────────────────────────

it('syncs groups idempotently', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $group1 = ClientGroup::factory()->create();
    $group2 = ClientGroup::factory()->create();

    $service = app(ClientService::class);

    $service->syncGroups($client, [$group1->id]);
    expect($client->groups()->count())->toBe(1);

    $service->syncGroups($client, [$group1->id, $group2->id]);
    expect($client->groups()->count())->toBe(2);

    $service->syncGroups($client, []);
    expect($client->groups()->count())->toBe(0);
});
