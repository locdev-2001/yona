<?php

use Illuminate\Support\Facades\DB;

// Octane/persistent-connection safety: leaked RLS context from a prior pooled
// request must be cleared before the next request runs any query.

it('clears leaked RLS context at the start of a web request', function () {
    // Simulate a previous request leaving tenant context on the connection.
    setWorkspaceContext('11111111-1111-1111-1111-111111111111');
    setUserContext(999);

    // A request that establishes no workspace context (guest welcome page).
    $this->get('/')->assertOk();

    $workspace = DB::scalar("select current_setting('app.current_workspace', true)");
    $user = DB::scalar("select current_setting('app.current_user_id', true)");

    expect($workspace === '' || $workspace === null)->toBeTrue()
        ->and($user === '' || $user === null)->toBeTrue();
});
