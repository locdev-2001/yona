<?php

use App\Models\Client;
use App\Models\Contact;
use App\Models\User;
use App\Services\CustomFieldService;
use App\Models\Workspace;

/**
 * G6 — custom-field morphism guard.
 * apply() called with a 'contact' entityType on a Client model → throw.
 * (The service derives entityType from the model's customFieldEntityType().)
 */
it('client customFieldEntityType returns client', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    expect($client->customFieldEntityType())->toBe('client');
});

it('contact customFieldEntityType returns contact', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $contact = Contact::factory()->create(['client_id' => $client->id]);
    expect($contact->customFieldEntityType())->toBe('contact');
});

it('CustomFieldService.apply does not throw for client entity type', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $service = app(CustomFieldService::class);

    // No definitions exist → nothing applied; should not throw
    expect(fn () => $service->apply($client, []))->not->toThrow(Exception::class);
});

it('CustomFieldService.apply does not throw for contact entity type', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $client = Client::factory()->create();
    $contact = Contact::factory()->create(['client_id' => $client->id]);
    $service = app(CustomFieldService::class);

    // No definitions exist → nothing applied; should not throw
    expect(fn () => $service->apply($contact, []))->not->toThrow(Exception::class);
});
