<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * P06 — RLS (Layer 3) for all client-module tables.
 * Pattern identical to enable_rls_on_tenant_tables + enable_rls_on_p03_tables.
 * G4 — pivot tables (client_group_client, client_user) are included because
 * they carry workspace_id and MUST appear in RlsPolicyCoverageTest whitelist.
 */
return new class extends Migration
{
    /** @var list<string> */
    private array $tables = [
        'clients',
        'contacts',
        'client_groups',
        'client_group_client',
        'client_user',
        'client_vault_entries',
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
