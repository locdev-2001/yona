<?php

namespace Tests;

use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

abstract class TestCase extends BaseTestCase
{
    /**
     * Reset the Postgres RLS context before each DB-backed test. The settings
     * are session-level (not transactional), so a leak from a prior test could
     * otherwise mask a default-deny bug or break a WITH CHECK insert.
     */
    protected function setUp(): void
    {
        parent::setUp();

        if (config('database.default') === 'pgsql') {
            DB::statement("select set_config('app.current_workspace', '', false)");
            DB::statement("select set_config('app.current_user_id', '', false)");
            app(PermissionRegistrar::class)->setPermissionsTeamId(null);
        }
    }

    /**
     * Create a user who is an active member of a fresh workspace (with the
     * matching spatie role), for tests hitting workspace-scoped routes. The
     * RLS context is cleared afterwards so the request middleware re-establishes
     * it exactly as production does.
     */
    protected function createWorkspaceUser(string $role = 'admin'): User
    {
        $workspace = Workspace::factory()->create();
        $user = User::factory()->create();

        DB::statement("select set_config('app.current_workspace', ?, false)", [$workspace->id]);
        DB::statement("select set_config('app.current_user_id', ?, false)", [(string) $user->id]);
        app(PermissionRegistrar::class)->setPermissionsTeamId($workspace->id);

        $member = new WorkspaceMember;
        $member->workspace_id = $workspace->id;
        $member->user_id = $user->id;
        $member->role = $role;
        $member->status = 'active';
        $member->joined_at = now();
        $member->save();

        $user->assignRole($role);

        DB::statement("select set_config('app.current_workspace', '', false)");
        DB::statement("select set_config('app.current_user_id', '', false)");

        return $user;
    }
}
