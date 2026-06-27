<?php

use App\Models\Client;
use App\Models\Contact;
use Modules\Identity\Models\User;
use Modules\Tenancy\Models\Workspace;
use Illuminate\Database\QueryException;

/**
 * G10 — Contact email partial unique index:
 * (workspace_id, email) WHERE email IS NOT NULL AND deleted_at IS NULL
 *
 * Scenarios:
 * - Same email in same workspace → violation
 * - Same email in different workspace → OK
 * - Multiple NULL emails in same workspace → OK
 * - Reusing email of soft-deleted contact in same workspace → OK
 */
it('rejects duplicate active email in the same workspace', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    Contact::factory()->create(['client_id' => $client->id, 'email' => 'dup@example.com']);

    expect(function () use ($client) {
        Contact::factory()->create(['client_id' => $client->id, 'email' => 'dup@example.com']);
    })->toThrow(QueryException::class);
});

it('allows same email in different workspaces', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();
    $userA = User::factory()->create();

    actingInWorkspace($wsA, $userA);
    seedMember($wsA, $userA, 'admin');
    $clientA = Client::factory()->create();
    Contact::factory()->create(['client_id' => $clientA->id, 'email' => 'shared@example.com']);
    clearWorkspaceContext();

    $userB = User::factory()->create();
    actingInWorkspace($wsB, $userB);
    seedMember($wsB, $userB, 'admin');
    $clientB = Client::factory()->create();

    // Should not throw
    $contact = Contact::factory()->create(['client_id' => $clientB->id, 'email' => 'shared@example.com']);
    expect($contact->id)->not->toBeNull();
});

it('allows multiple NULL emails in the same workspace', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();

    // Multiple contacts with no email — should be fine (partial index only on non-null)
    Contact::factory()->withoutEmail()->create(['client_id' => $client->id]);
    Contact::factory()->withoutEmail()->create(['client_id' => $client->id]);
    Contact::factory()->withoutEmail()->create(['client_id' => $client->id]);

    expect(Contact::where('client_id', $client->id)->whereNull('email')->count())->toBe(3);
});

it('allows reusing email of a soft-deleted contact', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();

    $contact = Contact::factory()->create(['client_id' => $client->id, 'email' => 'reuse@example.com']);
    $contact->delete(); // soft delete

    // Same email should now be available again
    $newContact = Contact::factory()->create(['client_id' => $client->id, 'email' => 'reuse@example.com']);
    expect($newContact->id)->not->toBeNull();
});
