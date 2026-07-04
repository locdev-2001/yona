<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * P10 [d] — GRANT sequence nghiệp vụ zalo_connection_id_seq (800001) cho
 * cho_rach_app: sequence tạo trước lần chạy setup-roles.sql nên không nằm
 * trong ALTER DEFAULT PRIVILEGES (chỉ áp object tạo SAU). Pattern 300001
 * (300001 grant seq PK zalo_connections_id_seq — KHÁC sequence này).
 * Cho phép nextConnectionId() về connection mặc định (1 session cả flow store).
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::connection('pgsql_privileged')->statement(
            'GRANT USAGE, SELECT ON SEQUENCE zalo_connection_id_seq TO cho_rach_app'
        );
    }

    public function down(): void
    {
        DB::connection('pgsql_privileged')->statement(
            'REVOKE USAGE, SELECT ON SEQUENCE zalo_connection_id_seq FROM cho_rach_app'
        );
    }
};
