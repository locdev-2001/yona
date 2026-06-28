<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * P07 channel-zalo — Tạo Postgres sequence toàn cục cho zalo_connection_id.
 *
 * connection_id là slot bridge (bigint) — UNIQUE CROSS-TENANT vì bridge map
 * 1-1 với mỗi tài khoản Zalo, không reset per-workspace.
 * Dùng sequence (không WorkspaceSequence) vì bridge không biết workspace_id.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::connection('pgsql_privileged')->statement(
            'CREATE SEQUENCE IF NOT EXISTS zalo_connection_id_seq START WITH 1 INCREMENT BY 1 NO CYCLE'
        );
    }

    public function down(): void
    {
        DB::connection('pgsql_privileged')->statement(
            'DROP SEQUENCE IF EXISTS zalo_connection_id_seq'
        );
    }
};
