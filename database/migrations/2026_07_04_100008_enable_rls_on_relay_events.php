<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * P10 (inbox-multichannel-relayer) — RLS cho relay_events.
 * Pattern: 2026_07_04_100006_enable_rls_on_channel_account_tables.php.
 *
 * Bảng được whitelist trong tests/Feature/Rls/RlsPolicyCoverageTest.php.
 */
return new class extends Migration
{
    public function up(): void
    {
        $db = DB::connection('pgsql_privileged');
        $predicate = "workspace_id = nullif(current_setting('app.current_workspace', true), '')::uuid";

        $db->statement('ALTER TABLE relay_events ENABLE ROW LEVEL SECURITY');
        $db->statement('ALTER TABLE relay_events FORCE ROW LEVEL SECURITY');
        $db->statement('DROP POLICY IF EXISTS ws_isolation ON relay_events');
        $db->statement("CREATE POLICY ws_isolation ON relay_events USING ({$predicate}) WITH CHECK ({$predicate})");
        $db->statement('GRANT SELECT, INSERT, UPDATE, DELETE ON relay_events TO yona_app');
    }

    public function down(): void
    {
        $db = DB::connection('pgsql_privileged');
        $db->statement('DROP POLICY IF EXISTS ws_isolation ON relay_events');
        $db->statement('ALTER TABLE relay_events NO FORCE ROW LEVEL SECURITY');
        $db->statement('ALTER TABLE relay_events DISABLE ROW LEVEL SECURITY');
    }
};
