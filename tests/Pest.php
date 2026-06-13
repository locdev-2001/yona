<?php

use App\Models\Team;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind a different classes or traits.
|
*/

// RLS context is reset for every DB-backed test in Tests\TestCase::setUp().
pest()->extend(TestCase::class)
    ->use(DatabaseTransactions::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

/**
 * Set the Postgres RLS tenant context on the runtime connection. Passing null
 * clears it ('' → NULL via the policy's nullif → default-deny).
 */
function setWorkspaceContext(?string $workspaceId): void
{
    DB::statement("select set_config('app.current_workspace', ?, false)", [$workspaceId ?? '']);
}

/**
 * Set the RLS user context (exposes the user's own workspace_member rows).
 */
function setUserContext(int|string|null $userId): void
{
    DB::statement("select set_config('app.current_user_id', ?, false)", [$userId === null ? '' : (string) $userId]);
}

function clearWorkspaceContext(): void
{
    setWorkspaceContext(null);
    setUserContext(null);
    app(PermissionRegistrar::class)->setPermissionsTeamId(null);
}

/**
 * Enter a workspace for the duration of a test: bind the app-layer context
 * (global scope), the DB RLS context, and spatie's team scope; optionally
 * authenticate a user + bind their membership. Mirrors IdentifyWorkspace.
 */
function actingInWorkspace(Workspace $workspace, ?User $user = null): ?User
{
    app()->instance('currentWorkspace', $workspace);
    setWorkspaceContext($workspace->id);
    app(PermissionRegistrar::class)->setPermissionsTeamId($workspace->id);

    if ($user) {
        setUserContext($user->getKey());
        if ($membership = $user->membershipFor($workspace)) {
            app()->instance('currentMembership', $membership);
        }
        test()->actingAs($user);
    }

    return $user;
}

/**
 * Create an active membership AND assign the matching spatie role within the
 * workspace (what MembershipService does at runtime). Requires that the
 * workspace context is appropriate for RLS inserts.
 */
function seedMember(Workspace $workspace, User $user, string $role = 'sales_rep', ?Team $team = null): WorkspaceMember
{
    setWorkspaceContext($workspace->id);
    setUserContext($user->getKey());

    $member = WorkspaceMember::factory()->for($workspace)->create([
        'user_id' => $user->id,
        'role' => $role,
        'team_id' => $team?->id,
        'status' => 'active',
    ]);

    app(PermissionRegistrar::class)->setPermissionsTeamId($workspace->id);
    $user->assignRole($role);

    return $member;
}
