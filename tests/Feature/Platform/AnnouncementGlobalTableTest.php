<?php

use Illuminate\Support\Facades\DB;
use Modules\Announcements\Models\Announcement;
use Modules\Announcements\Models\AnnouncementRead;
use Modules\Announcements\Services\AnnouncementReadService;
use Modules\Identity\Models\User;
use Modules\Tenancy\Models\Workspace;

// ---------------------------------------------------------------------------
// AnnouncementGlobalTableTest — Negative: no RLS on global tables + coherence
//
// DESIGN INTENT: announcements + announcement_reads are intentionally GLOBAL
// (no workspace_id, no RLS, no BelongsToWorkspace). These tests prove this is
// a deliberate decision, not an oversight. They prevent future cargo-cult
// additions of workspace_id / RLS to these tables.
// ---------------------------------------------------------------------------

// --- Negative: zero RLS policies on global announcement tables ---

it('announcements table has ZERO pg_policies (intentional: global, no RLS)', function () {
    $count = DB::table('pg_policies')
        ->where('schemaname', 'public')
        ->where('tablename', 'announcements')
        ->count();

    expect($count)->toBe(0);
});

it('announcement_reads table has ZERO pg_policies (intentional: global, no RLS)', function () {
    $count = DB::table('pg_policies')
        ->where('schemaname', 'public')
        ->where('tablename', 'announcement_reads')
        ->count();

    expect($count)->toBe(0);
});

// --- Negative: announcements tables have NO workspace_id column ---

it('announcements table has no workspace_id column (global by design)', function () {
    $hasColumn = DB::table('information_schema.columns')
        ->where('table_schema', 'public')
        ->where('table_name', 'announcements')
        ->where('column_name', 'workspace_id')
        ->exists();

    expect($hasColumn)->toBeFalse();
});

it('announcement_reads table has no workspace_id column (global by design)', function () {
    $hasColumn = DB::table('information_schema.columns')
        ->where('table_schema', 'public')
        ->where('table_name', 'announcement_reads')
        ->where('column_name', 'workspace_id')
        ->exists();

    expect($hasColumn)->toBeFalse();
});

// --- RlsPolicyCoverageTest still passes: global tables excluded ---
// The existing RlsPolicyCoverageTest asserts every workspace-scoped table
// (with workspace_id) has a policy. Since global tables have NO workspace_id,
// they are excluded from that test's query and cause no failure.

it('global tables are excluded from workspace-scoped RLS coverage query', function () {
    $tenantTables = DB::table('information_schema.columns')
        ->where('table_schema', 'public')
        ->where('column_name', 'workspace_id')
        ->where('table_name', '!=', 'workspaces')
        ->distinct()
        ->pluck('table_name');

    expect($tenantTables->contains('announcements'))->toBeFalse();
    expect($tenantTables->contains('announcement_reads'))->toBeFalse();
});

// --- Cross-workspace read coherence: user reads globally (not per workspace) ---

it('announcement read state is global — reading in workspace A removes unread badge in workspace B', function () {
    $workspaceA = Workspace::factory()->create();
    $workspaceB = Workspace::factory()->create();
    $user = User::factory()->create();

    seedMember($workspaceA, $user);
    clearWorkspaceContext();
    seedMember($workspaceB, $user);
    clearWorkspaceContext();

    $announcement = Announcement::factory()->published()->create();

    // Before: no read row exists
    $existsBefore = AnnouncementRead::where('announcement_id', $announcement->id)
        ->where('user_id', $user->id)
        ->exists();
    expect($existsBefore)->toBeFalse();

    // Mark read via service (global — announcement_reads has no workspace_id)
    /** @var AnnouncementReadService $service */
    $service = app(AnnouncementReadService::class);
    $service->markRead($announcement, $user);

    // After: exactly ONE row — visible regardless of workspace context
    $readCount = AnnouncementRead::where('announcement_id', $announcement->id)
        ->where('user_id', $user->id)
        ->count();
    expect($readCount)->toBe(1);

    // The service sees it as read regardless of which workspace is active
    $unreadCountA = $service->unreadQuery($user, $workspaceA)
        ->where('id', $announcement->id)
        ->count();

    $unreadCountB = $service->unreadQuery($user, $workspaceB)
        ->where('id', $announcement->id)
        ->count();

    expect($unreadCountA)->toBe(0);
    expect($unreadCountB)->toBe(0);
});

// --- Default connection can access global tables with any workspace context ---
// Confirms YAGNI: no privileged connection needed for global tables.

it('default connection can read announcements with any workspace context set', function () {
    $workspace = Workspace::factory()->create();
    setWorkspaceContext($workspace->id);

    $announcement = Announcement::factory()->published()->create();

    // Global query — no RLS policy exists, so the row is always visible
    $found = Announcement::find($announcement->id);

    expect($found)->not->toBeNull();
    /** @var Announcement $found */
    expect($found->id)->toBe($announcement->id);

    clearWorkspaceContext();
});
