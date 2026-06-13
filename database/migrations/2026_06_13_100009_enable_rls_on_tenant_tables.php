<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Layer 3 of tenant isolation (arch §4, BR-X18): Postgres Row-Level Security,
 * default-deny. Even a query that escapes the Eloquent global scope (raw SQL,
 * a forgotten trait) cannot cross workspaces. Run as the owner; the runtime
 * `cho_rach_app` role is non-owner/non-superuser so policies bind to it.
 *
 * `nullif(current_setting(...,true), '')::uuid` yields NULL when the tenant
 * context is unset or cleared → `workspace_id = NULL` matches nothing
 * (default-deny) without raising an invalid-uuid error.
 */
return new class extends Migration
{
    /** @var list<string> Workspace-scoped tables (every table carrying workspace_id). */
    private array $tables = [
        'teams',
        'team_closure',
        'workspace_member',
        'audit_logs',
        'workspace_sequences',
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
