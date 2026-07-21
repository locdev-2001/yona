<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * P01 (inbox-multichannel-relayer) — RLS cho 4 bảng mới của re-key L2.
 * Pattern: 2026_06_28_700003_enable_rls_on_inbox_tables.php.
 *
 * Bảng được whitelist trong tests/Feature/Rls/RlsPolicyCoverageTest.php.
 */
return new class extends Migration
{
    /** @var list<string> */
    private array $tables = [
        'channel_accounts',
        'conversation_events',
        'message_source_aliases',
        'lead_merge_conflicts',
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
