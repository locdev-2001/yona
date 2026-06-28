<?php

use App\Enums\AnnouncementStatus;
use App\Models\Announcement;
use App\Support\AnnouncementMarkdown;
use Illuminate\Support\Facades\DB;

// ---------------------------------------------------------------------------
// AnnouncementManagementTest — Admin-plane authz, CRUD, publish, audit, rules
// ---------------------------------------------------------------------------

// --- Authorization ---

it('forbids a guest from accessing admin announcements', function () {
    $this->get(route('admin.announcements.index'))->assertRedirect(route('admin.login'));
});

it('forbids an admin without platform.announcements.manage', function () {
    actingAsAdmin(roles: []);

    $this->get(route('admin.announcements.index'))->assertForbidden();
    $this->get(route('admin.announcements.create'))->assertForbidden();
});

it('lets a permitted admin list announcements', function () {
    actingAsAdmin();

    $this->get(route('admin.announcements.index'))->assertOk();
});

// --- Store: creates slug + body_html ---

it('creates an announcement with auto-slug and rendered body_html', function () {
    $admin = actingAsAdmin();

    $response = $this->post(route('admin.announcements.store'), [
        'title' => 'New Feature Alert',
        'body' => '## Hello\n\nWelcome to the **new** feature.',
        'category' => 'feature',
        'audience' => ['type' => 'all'],
    ]);

    $response->assertRedirect();

    $announcement = Announcement::where('title', 'New Feature Alert')->first();

    expect($announcement)->not->toBeNull()
        ->and($announcement->slug)->toBe('new-feature-alert')
        ->and($announcement->status)->toBe(AnnouncementStatus::Draft)
        ->and($announcement->created_by)->toBe($admin->id)
        ->and($announcement->body_html)->toContain('<strong>new</strong>');
});

it('stores audience as a jsonb object even when the form submits a JSON string', function () {
    actingAsAdmin();

    // The admin form (useForm) submits audience as a JSON string. The service
    // must coerce it to an array so the jsonb column holds an OBJECT — a
    // double-encoded string silently breaks the tenant unread filter
    // (audience->>'type' becomes NULL, the CHECK passes, the feed shows nothing).
    $this->post(route('admin.announcements.store'), [
        'title' => 'String Audience Release',
        'body' => 'Body.',
        'category' => 'feature',
        'audience' => json_encode(['type' => 'all']),
    ])->assertRedirect();

    $announcement = Announcement::where('title', 'String Audience Release')->first();
    expect($announcement)->not->toBeNull();

    $row = DB::selectOne(
        "select jsonb_typeof(audience) as jt, audience->>'type' as type from announcements where id = ?",
        [$announcement->id]
    );

    expect($row->jt)->toBe('object')
        ->and($row->type)->toBe('all');
});

it('rejects audience with type other than all (v1 lock)', function () {
    actingAsAdmin();

    $this->post(route('admin.announcements.store'), [
        'title' => 'Target Test',
        'body' => 'Body text here.',
        'category' => 'announcement',
        'audience' => ['type' => 'by_plan'],
    ])->assertSessionHasErrors('audience');
});

it('rejects a cover_image with a private IP (SSRF guard)', function () {
    actingAsAdmin();

    $this->post(route('admin.announcements.store'), [
        'title' => 'SSRF Guard',
        'body' => 'Body.',
        'category' => 'feature',
        'audience' => ['type' => 'all'],
        'cover_image' => 'https://192.168.1.1/image.png',
    ])->assertSessionHasErrors('cover_image');
});

it('rejects a cover_image that is not https', function () {
    actingAsAdmin();

    $this->post(route('admin.announcements.store'), [
        'title' => 'HTTP Image',
        'body' => 'Body.',
        'category' => 'feature',
        'audience' => ['type' => 'all'],
        'cover_image' => 'http://example.com/image.png',
    ])->assertSessionHasErrors('cover_image');
});

// --- Publish / Unpublish: atomic status + published_at ---

it('publishes a draft announcement atomically', function () {
    actingAsAdmin();

    $announcement = Announcement::factory()->draft()->create();

    $this->post(route('admin.announcements.publish', $announcement))
        ->assertRedirect();

    $announcement->refresh();

    expect($announcement->status)->toBe(AnnouncementStatus::Published)
        ->and($announcement->published_at)->not->toBeNull();
});

it('unpublishes a published announcement back to draft', function () {
    actingAsAdmin();

    $announcement = Announcement::factory()->published()->create();

    $this->delete(route('admin.announcements.unpublish', $announcement))
        ->assertRedirect();

    $announcement->refresh();

    expect($announcement->status)->toBe(AnnouncementStatus::Draft)
        ->and($announcement->published_at)->toBeNull();
});

// --- Audit log ---

it('records a create audit log entry when an announcement is stored', function () {
    actingAsAdmin();

    $this->post(route('admin.announcements.store'), [
        'title' => 'Audit Create Test',
        'body' => 'Body content.',
        'category' => 'improvement',
        'audience' => ['type' => 'all'],
    ]);

    $announcement = Announcement::where('title', 'Audit Create Test')->first();

    // Announcements are global (workspace_id = NULL). Their audit entries are
    // written via pgsql_privileged and hidden from the runtime cho_rach_app
    // connection by RLS (NULL ≠ UUID). Read through the privileged connection.
    $logEntry = DB::connection('pgsql_privileged')->table('audit_logs')
        ->where('entity_type', (new Announcement)->getMorphClass())
        ->where('entity_id', $announcement->id)
        ->where('action', 'create')
        ->first();

    expect($logEntry)->not->toBeNull();
});

it('records an update audit log entry when an announcement is updated', function () {
    $admin = actingAsAdmin();

    $announcement = Announcement::factory()->draft()->create(['created_by' => $admin->id]);

    $this->patch(route('admin.announcements.update', $announcement), [
        'title' => 'Updated Title',
        'body' => 'Updated body.',
        'category' => 'fix',
        'audience' => ['type' => 'all'],
    ]);

    // Read via privileged connection — global audit entries have workspace_id = NULL,
    // which RLS hides from the runtime cho_rach_app connection.
    $logEntry = DB::connection('pgsql_privileged')->table('audit_logs')
        ->where('entity_type', (new Announcement)->getMorphClass())
        ->where('entity_id', $announcement->id)
        ->where('action', 'update')
        ->first();

    expect($logEntry)->not->toBeNull();
});

it('records a delete audit log entry when an announcement is destroyed', function () {
    $admin = actingAsAdmin();

    $announcement = Announcement::factory()->draft()->create(['created_by' => $admin->id]);

    $this->delete(route('admin.announcements.destroy', $announcement));

    // Read via privileged connection — global audit entries have workspace_id = NULL,
    // which RLS hides from the runtime cho_rach_app connection.
    $logEntry = DB::connection('pgsql_privileged')->table('audit_logs')
        ->where('entity_type', (new Announcement)->getMorphClass())
        ->where('entity_id', $announcement->id)
        ->where('action', 'delete')
        ->first();

    expect($logEntry)->not->toBeNull();
});

// --- Markdown XSS: <script>/onerror stripped ---

it('strips <script> tags from body_html during markdown render', function () {
    $html = AnnouncementMarkdown::toHtml('<script>alert("xss")</script> ## Hello');

    expect($html)->not->toContain('<script>')
        ->and($html)->not->toContain('alert("xss")');
});

it('strips onerror attributes from body_html during markdown render', function () {
    $html = AnnouncementMarkdown::toHtml('<img src="x" onerror="alert(1)" />');

    expect($html)->not->toContain('onerror');
});
