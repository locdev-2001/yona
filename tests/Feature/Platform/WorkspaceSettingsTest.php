<?php

use Modules\Identity\Models\AuditLog;
use Modules\Identity\Models\User;
use Modules\Tenancy\Models\Workspace;

// Settings → Workspace (admin-gated, audited). BR-X12.

function adminInWorkspace(Workspace $workspace): User
{
    $user = User::factory()->create();
    seedMember($workspace, $user, 'admin');

    return $user;
}

it('lets an admin view the workspace settings page', function () {
    $ws = Workspace::factory()->create();
    $user = adminInWorkspace($ws);

    $this->actingAs($user)->get('/settings/workspace')->assertOk();
});

it('updates workspace settings and writes an audit entry', function () {
    $ws = Workspace::factory()->create(['name' => 'Old Name']);
    $user = adminInWorkspace($ws);

    $this->actingAs($user)
        ->from('/settings/workspace')
        ->patch('/settings/workspace', [
            'name' => 'New Name',
            'base_currency' => 'USD',
            'timezone' => 'Asia/Bangkok',
            'locale' => 'en',
            'audit_retention' => '90d',
        ])
        ->assertRedirect('/settings/workspace')
        ->assertSessionHasNoErrors();

    expect($ws->fresh()->name)->toBe('New Name')
        ->and($ws->fresh()->base_currency)->toBe('USD');

    expect(
        AuditLog::where('entity_type', $ws->getMorphClass())
            ->where('entity_id', $ws->id)
            ->where('action', 'update')
            ->exists()
    )->toBeTrue();
});

it('forbids a non-admin from viewing or updating workspace settings', function () {
    $ws = Workspace::factory()->create();
    $viewer = User::factory()->create();
    seedMember($ws, $viewer, 'viewer');

    $this->actingAs($viewer)->get('/settings/workspace')->assertForbidden();

    $this->actingAs($viewer)
        ->patch('/settings/workspace', [
            'name' => 'Hacked',
            'base_currency' => 'USD',
            'timezone' => 'UTC',
            'locale' => 'en',
            'audit_retention' => '1y',
        ])
        ->assertForbidden();

    expect($ws->fresh()->name)->not->toBe('Hacked');
});

it('validates workspace settings input', function () {
    $ws = Workspace::factory()->create();
    $user = adminInWorkspace($ws);

    $this->actingAs($user)
        ->from('/settings/workspace')
        ->patch('/settings/workspace', [
            'name' => '',
            'base_currency' => 'XXX',
            'timezone' => 'Nowhere/Void',
            'locale' => 'fr',
            'audit_retention' => 'eternity',
        ])
        ->assertSessionHasErrors(['name', 'base_currency', 'timezone', 'locale', 'audit_retention']);
});
