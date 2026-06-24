<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Layer 3 tenant isolation for P03 polymorphic tables (BR-X18).
 * Pattern identical to enable_rls_on_tenant_tables (2026_06_13_100009).
 * taggables pivot is MANDATORY — G4 requires pivot tables with workspace_id
 * to carry RLS + appear in RlsPolicyCoverageTest whitelist.
 *
 * Run as pgsql_privileged (owner role); the runtime cho_rach_app role is
 * non-owner so policies bind to it (default-deny when context unset).
 */
return new class extends Migration
{
    /** @var list<string> */
    private array $tables = [
        'attachments',
        'tags',
        'taggables',
        'comments',
        'notes',
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
            // Grant DML to the runtime app role (may not be auto-granted when tables
            // are created by the superuser rather than cho_rach_owner).
            $db->statement("GRANT SELECT, INSERT, UPDATE, DELETE ON {$table} TO cho_rach_app");
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
