<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * P03 (inbox-multichannel-relayer) — cho_rach_app thiếu USAGE trên
 * zalo_connections_id_seq (sequence ngầm của $table->id()): sequence này
 * được tạo trước lần chạy `setup-roles.sql`/`make db-roles` gần nhất nên
 * không nằm trong `ALTER DEFAULT PRIVILEGES` (chỉ áp dụng object tạo SAU).
 *
 * Phát hiện khi viết test P03: insert zalo_connections qua connection RLS-bound
 * (cho_rach_app) — cần để CÙNG session với Workspace/ChannelAccount vừa tạo
 * trong transaction test (pgsql_privileged là session khác, không thấy row
 * chưa commit → FK violation). Trước đây né bằng cách insert cả bảng qua
 * pgsql_privileged — không còn né được nữa vì zalo_connections.channel_account_id
 * giờ FK sang channel_accounts (cũng cần cùng session).
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::connection('pgsql_privileged')->statement(
            'GRANT USAGE, SELECT ON SEQUENCE zalo_connections_id_seq TO cho_rach_app'
        );
    }

    public function down(): void
    {
        DB::connection('pgsql_privileged')->statement(
            'REVOKE USAGE, SELECT ON SEQUENCE zalo_connections_id_seq FROM cho_rach_app'
        );
    }
};
