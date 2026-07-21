<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * P05 — Row-Level Security for email_templates (BR-X18, C4).
 *
 * Mirrors enable_rls_on_activity_reminder_tables.php.
 * Grants DML to the runtime app role so non-owner sessions can read/write
 * inside their workspace boundary.
 */
return new class extends Migration
{
    public function up(): void
    {
        $db = DB::connection('pgsql_privileged');
        $predicate = "workspace_id = nullif(current_setting('app.current_workspace', true), '')::uuid";

        $db->statement('ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY');
        $db->statement('ALTER TABLE email_templates FORCE ROW LEVEL SECURITY');
        $db->statement('DROP POLICY IF EXISTS ws_isolation ON email_templates');
        $db->statement("CREATE POLICY ws_isolation ON email_templates USING ({$predicate}) WITH CHECK ({$predicate})");
        $db->statement('GRANT SELECT, INSERT, UPDATE, DELETE ON email_templates TO crm_app');
    }

    public function down(): void
    {
        $db = DB::connection('pgsql_privileged');

        $db->statement('DROP POLICY IF EXISTS ws_isolation ON email_templates');
        $db->statement('ALTER TABLE email_templates NO FORCE ROW LEVEL SECURITY');
        $db->statement('ALTER TABLE email_templates DISABLE ROW LEVEL SECURITY');
    }
};
