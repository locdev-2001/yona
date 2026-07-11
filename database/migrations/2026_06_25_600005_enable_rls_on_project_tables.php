<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * P08 — Layer 3 tenant isolation for project tables (BR-X18, G4).
 * Pattern: identical to enable_rls_on_tenant_tables (2026_06_13_100009).
 *
 * Pivot `project_members` carries workspace_id → RLS MANDATORY (G4).
 * project_statuses RLS is owned by P01 — NOT included here (G11).
 *
 * Run as pgsql_privileged (owner); crm_app is non-owner → policies bind.
 */
return new class extends Migration
{
    /** @var list<string> */
    private array $tables = [
        'projects',
        'project_members',
        'project_milestones',
        'project_discussions',
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
            $db->statement("GRANT SELECT, INSERT, UPDATE, DELETE ON {$table} TO crm_app");
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
