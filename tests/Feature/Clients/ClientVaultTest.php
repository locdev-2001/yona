<?php

use App\Models\Client;
use App\Models\ClientVaultEntry;
use Modules\Identity\Models\User;
use Modules\Tenancy\Models\Workspace;
use App\Services\ClientVaultService;
use Illuminate\Support\Facades\DB;

/**
 * Vault entry tests (should).
 * Verifies: create, encrypted storage (DB raw ≠ plaintext), delete.
 */
it('creates a vault entry for a client', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $service = app(ClientVaultService::class);

    $entry = $service->store($client, [
        'name' => 'SSH Key',
        'server_address' => 'server.example.com',
        'username' => 'root',
        'password' => 'supersecret',
        'visibility' => 'private',
    ]);

    expect($entry->id)->not->toBeNull();
    expect($entry->client_id)->toBe($client->id);
});

it('password is encrypted at rest in the database (should)', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $service = app(ClientVaultService::class);

    $plaintext = 'my-secret-password-123';
    $entry = $service->store($client, [
        'name' => 'DB Credentials',
        'password' => $plaintext,
        'visibility' => 'private',
    ]);

    // Raw DB value must NOT be the plaintext (encrypted cast applied)
    $rawPassword = DB::table('client_vault_entries')->where('id', $entry->id)->value('password');

    expect($rawPassword)->not->toBe($plaintext);
    expect($rawPassword)->not->toBeNull();

    // Model should decrypt transparently
    $fresh = ClientVaultEntry::find($entry->id);
    expect($fresh->password)->toBe($plaintext);
});

it('soft-deletes a vault entry', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $entry = ClientVaultEntry::factory()->create(['client_id' => $client->id]);
    $entryId = $entry->id;

    $service = app(ClientVaultService::class);
    $service->delete($entry);

    expect(ClientVaultEntry::find($entryId))->toBeNull();
    expect(ClientVaultEntry::withTrashed()->find($entryId))->not->toBeNull();
});
