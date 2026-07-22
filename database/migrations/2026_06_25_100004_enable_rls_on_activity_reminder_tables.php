<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Layer 3 tenant isolation (arch §4, BR-X18) for P04 tables.
 *
 * `activities` + `reminders` are workspace-scoped → RLS default-deny.
 * `notifications` is GLOBAL (no workspace_id, scoped by notifiable user) → NOT here.
 *
 * Pattern mirrors `enable_rls_on_tenant_tables.php`.
 */
return new class extends Migration
{
    /** @var list<string> */
    private array $tables = [
        'activities',
        'reminders',
    ];

    public function up(): void
    {
        $db = DB::connection('pgsql_privileged');
        $predicate = "workspace_id = nullif(current_setting('app.current_workspace', true), '')::uuid";

        foreach ($this->tables as $table) {
            $db->statement("ALTER TABLE {$table} ENABLE ROW LEVEL SECURITY");
            $db->statement("ALTER TABLE {$table} FORCE ROW LEVEL SECURITY");
            $db->statement("DROP POLICY IF EXISTS ws_isolation ON {$table}");
            $db->statement("CREATE POLICY ws_isolation ON {$table} USING ({$predicate}) WITH CHECK ({$predicate})");
            // Grant DML to the runtime app role (may not be auto-granted when
            // tables are created by the superuser rather than yona_owner).
            $db->statement("GRANT SELECT, INSERT, UPDATE, DELETE ON {$table} TO yona_app");
        }
    }

    public function down(): void
    {
        $db = DB::connection('pgsql_privileged');

        foreach ($this->tables as $table) {
            $db->statement("DROP POLICY IF EXISTS ws_isolation ON {$table}");
            $db->statement("ALTER TABLE {$table} NO FORCE ROW LEVEL SECURITY");
            $db->statement("ALTER TABLE {$table} DISABLE ROW LEVEL SECURITY");
        }
    }
};
