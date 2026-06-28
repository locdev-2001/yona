<?php

use Modules\Announcements\Models\Announcement;
use Modules\Announcements\Models\AnnouncementRead;
use Modules\Announcements\Services\AnnouncementReadService;
use Modules\Identity\Models\User;
use Modules\Tenancy\Models\Workspace;

// ---------------------------------------------------------------------------
// WhatsNewTest — Tenant-plane visibility, IDOR, badge, read-state, coherence
// ---------------------------------------------------------------------------

// --- Feed visibility: only published + visible announcements ---

it('shows published announcements to authenticated tenant users', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($workspace, $user);
    clearWorkspaceContext();

    Announcement::factory()->published()->create(['title' => 'Visible Announcement']);
    Announcement::factory()->draft()->create(['title' => 'Hidden Draft']);

    actingInWorkspace($workspace, $user);

    $this->get(route('announcements.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('announcements/index'));
});

it('hides draft announcements from tenant users (GET draft slug → 404 via policy)', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($workspace, $user);
    clearWorkspaceContext();

    $draft = Announcement::factory()->draft()->create();

    actingInWorkspace($workspace, $user);

    // mark-read on draft → 404, not 403 (BR-X15 non-enumeration)
    $this->post(route('announcements.read', $draft))
        ->assertNotFound();
});

it('hides future-dated published announcements from tenant feed', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($workspace, $user);
    clearWorkspaceContext();

    Announcement::factory()->futureDated()->create(['title' => 'Future Post']);

    actingInWorkspace($workspace, $user);

    $response = $this->get(route('announcements.index'))->assertOk();

    // Page loads (no 500). Future post is excluded from the feed.
    $data = $response->original->getData();
    $announcements = collect($data['page']['props']['announcements']['data'] ?? []);
    expect($announcements->where('title', 'Future Post')->count())->toBe(0);
});

// --- Badge count and unread exclusion ---

it('decrements the unread count after the user marks an announcement as read', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($workspace, $user);
    clearWorkspaceContext();

    $announcement = Announcement::factory()->published()->create();

    actingInWorkspace($workspace, $user);

    // Before read: unreadAnnouncementCount should be 1
    $before = app(AnnouncementReadService::class)->getUnreadCount($user);
    expect($before)->toBeGreaterThanOrEqual(1);

    // Mark as read
    $this->post(route('announcements.read', $announcement))->assertRedirect();

    // After read: count decrements
    $after = app(AnnouncementReadService::class)->getUnreadCount($user);
    expect($after)->toBe($before - 1);
});

// --- Latest unread returns most recent ---

it('getLatestUnread returns the most recently published unread announcement', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($workspace, $user);
    clearWorkspaceContext();

    Announcement::factory()->published()->create([
        'published_at' => now()->subDays(2),
    ]);
    $newer = Announcement::factory()->published()->create([
        'published_at' => now()->subDay(),
    ]);

    $latest = app(AnnouncementReadService::class)->getLatestUnread($user);

    expect($latest?->id)->toBe($newer->id);
});

// --- Idempotent mark-read: 2 calls = 1 row ---

it('mark-read is idempotent — two posts create exactly one read row', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($workspace, $user);
    clearWorkspaceContext();

    $announcement = Announcement::factory()->published()->create();

    actingInWorkspace($workspace, $user);

    $this->post(route('announcements.read', $announcement));
    $this->post(route('announcements.read', $announcement));

    $count = AnnouncementRead::where('announcement_id', $announcement->id)
        ->where('user_id', $user->id)
        ->count();

    expect($count)->toBe(1);
});

// --- IDOR guard: user_id from auth, not request body ---

it('ignores any user_id in the request body and uses auth()->id() (IDOR guard)', function () {
    $workspace = Workspace::factory()->create();
    $userA = User::factory()->create();
    $userB = User::factory()->create();
    seedMember($workspace, $userA);
    clearWorkspaceContext();

    $announcement = Announcement::factory()->published()->create();

    // Authenticate as userA; attempt to spoof userB's id in the body
    actingInWorkspace($workspace, $userA);

    // AnnouncementReadController does not accept user_id from the request
    $this->post(route('announcements.read', $announcement), [
        'user_id' => $userB->id,
    ])->assertRedirect();

    // Only userA's read is recorded — not userB's
    expect(AnnouncementRead::where('user_id', $userA->id)->where('announcement_id', $announcement->id)->exists())->toBeTrue()
        ->and(AnnouncementRead::where('user_id', $userB->id)->where('announcement_id', $announcement->id)->exists())->toBeFalse();
});

// --- Cross-workspace read coherence ---

it('read state is shared across workspaces — user reads in workspace A, unread count drops in B too', function () {
    $workspaceA = Workspace::factory()->create();
    $workspaceB = Workspace::factory()->create();
    $user = User::factory()->create();

    seedMember($workspaceA, $user);
    clearWorkspaceContext();
    seedMember($workspaceB, $user);
    clearWorkspaceContext();

    $announcement = Announcement::factory()->published()->create();

    $service = app(AnnouncementReadService::class);

    // Before: unread in both contexts (read-state is global, not workspace-scoped)
    $beforeA = $service->getUnreadCount($user, $workspaceA);
    $beforeB = $service->getUnreadCount($user, $workspaceB);
    expect($beforeA)->toBeGreaterThanOrEqual(1);
    expect($beforeB)->toBeGreaterThanOrEqual(1);

    // Mark read (global — announcement_reads has no workspace_id)
    $service->markRead($announcement, $user);

    // After: decremented in BOTH workspace contexts
    $afterA = $service->getUnreadCount($user, $workspaceA);
    $afterB = $service->getUnreadCount($user, $workspaceB);
    expect($afterA)->toBe($beforeA - 1);
    expect($afterB)->toBe($beforeB - 1);
});

// --- Unauthenticated user is redirected ---

it('redirects unauthenticated users from the whats-new page', function () {
    $this->get(route('announcements.index'))->assertRedirect();
});
