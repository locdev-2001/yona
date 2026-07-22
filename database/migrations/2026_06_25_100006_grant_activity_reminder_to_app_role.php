<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Ensure the runtime yona_app role has DML access on activities + reminders.
// The RLS migration (100004) added the policy but the GRANT was added afterwards
// in an additive forward-only migration (no migrate:fresh, per A3).
return new class extends Migration
{
    /** @var list<string> */
    private array $tables = ['activities', 'reminders'];

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
