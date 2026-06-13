<?php

use Illuminate\Support\Facades\DB;

// BR-X18 CI guard: every workspace-scoped table (i.e. carrying a workspace_id
// column, except the root `workspaces`) MUST have RLS enabled + a policy. This
// fails the build when a future tenant table forgets its isolation policy.

it('enforces RLS + a policy on every workspace-scoped table', function () {
    $tenantTables = DB::table('information_schema.columns')
        ->where('table_schema', 'public')
        ->where('column_name', 'workspace_id')
        ->where('table_name', '!=', 'workspaces')
        ->distinct()
        ->pluck('table_name');

    expect($tenantTables)->not->toBeEmpty();

    foreach ($tenantTables as $table) {
        $rlsEnabled = DB::table('pg_class')
            ->where('relname', $table)
            ->where('relkind', 'r')
            ->value('relrowsecurity');

        expect((bool) $rlsEnabled)->toBeTrue("RLS is not enabled on `{$table}`");

        $policyCount = DB::table('pg_policies')
            ->where('schemaname', 'public')
            ->where('tablename', $table)
            ->count();

        expect($policyCount)->toBeGreaterThan(0, "No RLS policy found on `{$table}`");
    }
});
