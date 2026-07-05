<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * P01b — RLS cho quick_replies. Pattern: 2026_07_04_500004.
 * Whitelist trong tests/Feature/Rls/RlsPolicyCoverageTest.php.
 */
return new class extends Migration
{
    public function up(): void
    {
        $db = DB::connection('pgsql_privileged');
        $predicate = "workspace_id = nullif(current_setting('app.current_workspace', true), '')::uuid";

        $db->statement('ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY');
        $db->statement('ALTER TABLE quick_replies FORCE ROW LEVEL SECURITY');
        $db->statement('DROP POLICY IF EXISTS ws_isolation ON quick_replies');
        $db->statement("CREATE POLICY ws_isolation ON quick_replies USING ({$predicate}) WITH CHECK ({$predicate})");
        $db->statement('GRANT SELECT, INSERT, UPDATE, DELETE ON quick_replies TO crm_app');
    }

    public function down(): void
    {
        $db = DB::connection('pgsql_privileged');
        $db->statement('DROP POLICY IF EXISTS ws_isolation ON quick_replies');
        $db->statement('ALTER TABLE quick_replies NO FORCE ROW LEVEL SECURITY');
        $db->statement('ALTER TABLE quick_replies DISABLE ROW LEVEL SECURITY');
    }
};
