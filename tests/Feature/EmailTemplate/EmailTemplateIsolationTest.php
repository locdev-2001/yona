<?php

use App\Models\EmailTemplate;
use App\Models\User;
use Modules\Tenancy\Models\Workspace;
use Illuminate\Support\Facades\DB;

// ── Tenant isolation (BR-X18) ─────────────────────────────────────────────────

it('workspace A template is not visible when acting in workspace B', function () {
    // Create WS-A and its template.
    $wsA = Workspace::factory()->create();
    $userA = User::factory()->create();
    seedMember($wsA, $userA, 'admin');
    actingInWorkspace($wsA, $userA);

    $templateA = EmailTemplate::factory()->create(['slug' => 'lead_assigned', 'language' => 'en']);

    // Switch to WS-B.
    $wsB = Workspace::factory()->create();
    $userB = User::factory()->create();
    seedMember($wsB, $userB, 'admin');
    actingInWorkspace($wsB, $userB);

    // WS-B should have zero templates.
    expect(EmailTemplate::count())->toBe(0);
});

it('accessing WS-A template from WS-B returns 404', function () {
    $wsA = Workspace::factory()->create();
    $userA = User::factory()->create();
    seedMember($wsA, $userA, 'admin');
    actingInWorkspace($wsA, $userA);

    $templateA = EmailTemplate::factory()->create();

    // Act as WS-B admin.
    $wsB = Workspace::factory()->create();
    $userB = User::factory()->create();
    seedMember($wsB, $userB, 'admin');
    actingInWorkspace($wsB, $userB);

    // Should 404 because RLS hides the template.
    $this->get(route('email-templates.edit', $templateA->id))->assertNotFound();
});

it('patch on WS-A template from WS-B returns 404', function () {
    $wsA = Workspace::factory()->create();
    $userA = User::factory()->create();
    seedMember($wsA, $userA, 'admin');
    actingInWorkspace($wsA, $userA);

    $templateA = EmailTemplate::factory()->create();

    $wsB = Workspace::factory()->create();
    $userB = User::factory()->create();
    seedMember($wsB, $userB, 'admin');
    actingInWorkspace($wsB, $userB);

    $this->patch(route('email-templates.update', $templateA->id), [
        'name' => 'Hacked',
        'subject' => 'Hacked',
        'body' => 'Hacked',
    ])->assertNotFound();
});

it('RLS: querying email_templates raw SQL in WS-B context returns no WS-A rows', function () {
    $wsA = Workspace::factory()->create();
    $userA = User::factory()->create();
    seedMember($wsA, $userA, 'admin');
    actingInWorkspace($wsA, $userA);

    EmailTemplate::factory()->count(3)->create();

    $wsB = Workspace::factory()->create();
    setWorkspaceContext($wsB->id);

    $count = DB::table('email_templates')->count();

    expect($count)->toBe(0);
});
