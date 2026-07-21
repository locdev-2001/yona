<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// GLOBAL notifications table is not RLS-managed, but the runtime crm_app
// role still needs explicit DML grants to INSERT notifications. Applied separately
// from the RLS migration because notifications is intentionally excluded from
// the RLS batch (no workspace_id).
return new class extends Migration
{
    public function up(): void
    {
        DB::connection('pgsql_privileged')
            ->statement('GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO crm_app');
    }

    public function down(): void
    {
        DB::connection('pgsql_privileged')
            ->statement('REVOKE SELECT, INSERT, UPDATE, DELETE ON notifications FROM crm_app');
    }
};
