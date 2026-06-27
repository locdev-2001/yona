<?php

use Illuminate\Database\Connection;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * RLS for spatie's workspace-scoped tables (team_foreign_key = workspace_id).
 *
 *  - roles: definitions are GLOBAL (workspace_id NULL) shared across workspaces,
 *    so the policy must keep NULL rows readable plus the active workspace's.
 *  - model_has_roles / model_has_permissions: every assignment is bound to a
 *    workspace — strict isolation (workspace_id = active).
 *
 * permissions + role_has_permissions carry no workspace_id (global catalog) →
 * no RLS needed.
 */
return new class extends Migration
{
    public function up(): void
    {
        $db = DB::connection('pgsql_privileged');
        $ws = "nullif(current_setting('app.current_workspace', true), '')::uuid";

        // Global definitions (NULL) stay visible; workspace-specific roles scoped.
        $rolesPredicate = "(workspace_id IS NULL OR workspace_id = {$ws})";
        $this->policy($db, 'roles', $rolesPredicate, $rolesPredicate);

        // Assignments are always workspace-bound — strict.
        $strict = "workspace_id = {$ws}";
        $this->policy($db, 'model_has_roles', $strict, $strict);
        $this->policy($db, 'model_has_permissions', $strict, $strict);
    }

    public function down(): void
    {
        $db = DB::connection('pgsql_privileged');

        foreach (['roles', 'model_has_roles', 'model_has_permissions'] as $table) {
            $db->statement("DROP POLICY IF EXISTS ws_isolation ON {$table}");
            $db->statement("ALTER TABLE {$table} NO FORCE ROW LEVEL SECURITY");
            $db->statement("ALTER TABLE {$table} DISABLE ROW LEVEL SECURITY");
        }
    }

    private function policy(Connection $db, string $table, string $using, string $check): void
    {
        $db->statement("ALTER TABLE {$table} ENABLE ROW LEVEL SECURITY");
        $db->statement("ALTER TABLE {$table} FORCE ROW LEVEL SECURITY");
        $db->statement("DROP POLICY IF EXISTS ws_isolation ON {$table}");
        $db->statement("CREATE POLICY ws_isolation ON {$table} USING ({$using}) WITH CHECK ({$check})");
    }
};
