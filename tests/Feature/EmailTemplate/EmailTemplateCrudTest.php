<?php

use App\Models\EmailTemplate;
use Modules\Identity\Models\User;
use Modules\Tenancy\Models\Workspace;

// ── Index ──────────────────────────────────────────────────────────────────────

it('admin can list email templates', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    EmailTemplate::factory()->create(['slug' => 'lead_assigned', 'language' => 'vi']);

    $this->get(route('email-templates.index'))->assertOk();
});

it('member without view permission gets 403 on index', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'sales_rep');
    actingInWorkspace($ws, $user);

    $this->get(route('email-templates.index'))->assertForbidden();
});

it('unauthenticated user is redirected from index', function () {
    $this->get(route('email-templates.index'))->assertRedirect(route('login'));
});

// ── Edit ──────────────────────────────────────────────────────────────────────

it('admin can view email template edit page', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $template = EmailTemplate::factory()->create();

    $this->get(route('email-templates.edit', $template))->assertOk();
});

it('member without manage permission cannot edit template', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'sales_rep');
    actingInWorkspace($ws, $user);

    $template = EmailTemplate::factory()->create();

    $this->get(route('email-templates.edit', $template))->assertForbidden();
});

// ── Update ────────────────────────────────────────────────────────────────────

it('admin can update email template content', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $template = EmailTemplate::factory()->create();

    $this->patch(route('email-templates.update', $template), [
        'name' => 'Updated Name',
        'subject' => 'New subject {lead_name}',
        'body' => '<p>New body {assignee_name}</p>',
        'plaintext' => false,
        'active' => true,
        'sort_order' => 1,
    ])->assertRedirect();

    $template->refresh();
    expect($template->name)->toBe('Updated Name')
        ->and($template->subject)->toBe('New subject {lead_name}');
});

it('update fails without manage permission', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'sales_rep');
    actingInWorkspace($ws, $user);

    $template = EmailTemplate::factory()->create();

    $this->patch(route('email-templates.update', $template), [
        'name' => 'Hack',
        'subject' => 'x',
        'body' => 'x',
    ])->assertForbidden();
});

it('update validates required fields', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $template = EmailTemplate::factory()->create();

    $this->patch(route('email-templates.update', $template), [
        'name' => '',
        'subject' => '',
        'body' => '',
    ])->assertSessionHasErrors(['name', 'subject', 'body']);
});

// ── Slug / type / language server-controlled ──────────────────────────────────

it('update cannot change slug type or language', function () {
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $template = EmailTemplate::factory()->create(['slug' => 'lead_assigned', 'language' => 'en']);

    $this->patch(route('email-templates.update', $template), [
        'name' => 'OK',
        'subject' => 'OK',
        'body' => 'OK',
        'slug' => 'hacked',
        'language' => 'ja',
    ]);

    $template->refresh();
    expect($template->slug)->toBe('lead_assigned')
        ->and($template->language)->toBe('en');
});
