<?php

use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
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

pest()->extend(TestCase::class)
    ->use(DatabaseTransactions::class)
    ->in('Feature');

// Platform tests run against real Postgres RLS. Reset the tenant context before
// each test so a leaked SET from a prior test can't mask a default-deny bug.
pest()->beforeEach(function () {
    clearWorkspaceContext();
})->in('Feature/Platform');

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
}

/**
 * Enter a workspace for the duration of a test: bind the app-layer context
 * (global scope) AND the DB RLS context, optionally authenticating a user and
 * binding their membership. Mirrors what IdentifyWorkspace does at runtime.
 */
function actingInWorkspace(Workspace $workspace, ?User $user = null): ?User
{
    app()->instance('currentWorkspace', $workspace);
    setWorkspaceContext($workspace->id);

    if ($user) {
        setUserContext($user->getKey());
        if ($membership = $user->membershipFor($workspace)) {
            app()->instance('currentMembership', $membership);
        }
        test()->actingAs($user);
    }

    return $user;
}
