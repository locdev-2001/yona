<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * P09 — Grant DML access on all task tables to the runtime yona_app role.
 * RLS migration (700006) enabled the policy; this migration adds the GRANT so the
 * application user can read/write within the RLS predicate. Forward-only per A3.
 */
return new class extends Migration
{
    /** @var list<string> */
    private array $tables = [
        'tasks',
        'task_assignees',
        'task_followers',
        'task_checklist_items',
        'task_timers',
    ];

    public function up(): void
    {
        $db = DB::connection('pgsql_privileged');

        foreach ($this->tables as $table) {
            $db->statement("GRANT SELECT, INSERT, UPDATE, DELETE ON {$table} TO yona_app");
        }
    }

    public function down(): void
    {
        $db = DB::connection('pgsql_privileged');

        foreach ($this->tables as $table) {
            $db->statement("REVOKE SELECT, INSERT, UPDATE, DELETE ON {$table} FROM yona_app");
        }
    }
};
