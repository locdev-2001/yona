<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Refine the workspace_member RLS policy so a user can always read their OWN
 * membership rows (any workspace) during request bootstrap — this lets
 * IdentifyWorkspace resolve the active workspace on the normal runtime
 * connection instead of a privileged cross-RLS read on every request.
 *
 * READ (USING): active-workspace rows OR the caller's own membership rows.
 * WRITE (WITH CHECK): strictly the active workspace — a user can never insert a
 * self-membership into an arbitrary workspace (anti privilege-escalation, S4).
 */
return new class extends Migration
{
    public function up(): void
    {
        $db = DB::connection('pgsql_privileged');
        $ws = "nullif(current_setting('app.current_workspace', true), '')::uuid";
        $uid = "nullif(current_setting('app.current_user_id', true), '')::bigint";

        $db->statement('DROP POLICY IF EXISTS ws_isolation ON workspace_member');
        $db->statement(
            'CREATE POLICY ws_isolation ON workspace_member '.
            "USING (workspace_id = {$ws} OR user_id = {$uid}) ".
            "WITH CHECK (workspace_id = {$ws})"
        );
    }

    public function down(): void
    {
        $db = DB::connection('pgsql_privileged');
        $predicate = "workspace_id = nullif(current_setting('app.current_workspace', true), '')::uuid";

        $db->statement('DROP POLICY IF EXISTS ws_isolation ON workspace_member');
        $db->statement("CREATE POLICY ws_isolation ON workspace_member USING ({$predicate}) WITH CHECK ({$predicate})");
    }
};
