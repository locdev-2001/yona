<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Đổi unique index (workspace_id, personal_uid) từ plain → partial (WHERE deleted_at IS NULL).
 *
 * Vấn đề: SoftDeletes giữ lại bản ghi đã xóa → khi reconnect cùng tài khoản Zalo sẽ vi phạm
 * unique constraint → SQLSTATE 23505. Partial index chỉ enforce với các bản ghi CHƯA xóa.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Laravel's $table->unique() tạo constraint, không phải bare index.
        // Postgres không cho DROP INDEX trực tiếp khi đang có constraint → dùng ALTER TABLE DROP CONSTRAINT.
        DB::statement('ALTER TABLE zalo_connections DROP CONSTRAINT IF EXISTS zalo_connections_workspace_id_personal_uid_unique');

        // Partial unique: chỉ enforce với bản ghi đang hoạt động (chưa soft-delete) và có personal_uid
        DB::statement('
            CREATE UNIQUE INDEX zalo_connections_ws_personal_uid_active_unique
            ON zalo_connections (workspace_id, personal_uid)
            WHERE deleted_at IS NULL AND personal_uid IS NOT NULL
        ');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS zalo_connections_ws_personal_uid_active_unique');

        // Khôi phục plain unique (cẩn thận: có thể fail nếu DB đang có trùng lặp)
        DB::statement('
            CREATE UNIQUE INDEX zalo_connections_workspace_id_personal_uid_unique
            ON zalo_connections (workspace_id, personal_uid)
        ');
    }
};
