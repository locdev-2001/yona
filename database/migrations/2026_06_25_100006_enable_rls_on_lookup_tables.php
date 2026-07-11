<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Layer 3 tenant isolation (BR-X18) for the Phase 01 lookup tables.
 * Mirrors enable_rls_on_tenant_tables — same predicate, same policy name.
 * Run as privileged owner; `crm_app` (runtime role) is non-owner so
 * policies bind to it.
 */
return new class extends Migration
{
    /** @var list<string> */
    private array $tables = [
        'pipelines',
        'pipeline_stages',
        'lead_sources',
        'project_statuses',
        'workspace_settings',
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
