<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Bước 3/3 — khóa `thread_kind` thành NOT NULL.
 *
 * Chỉ chạy được sau khi bước 2 đã xác nhận không còn hàng rỗng. Mặc định
 * `direct` áp cho hàng MỚI: hội thoại nhóm luôn được lớp dịch của kênh khai
 * tường minh, nên mặc định sai chỉ xảy ra khi có kênh quên khai — và lúc đó
 * `direct` là phía an toàn (không gửi đã-xem, không tạo Lead tự động).
 *
 * `thread_type` KHÔNG bị đụng: nó còn nguyên cho tới khi lớp dịch của Zalo
 * thôi cần nó.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::connection('pgsql_privileged')->statement(
            "ALTER TABLE conversations ALTER COLUMN thread_kind SET DEFAULT 'direct'"
        );
        DB::connection('pgsql_privileged')->statement(
            'ALTER TABLE conversations ALTER COLUMN thread_kind SET NOT NULL'
        );
    }

    public function down(): void
    {
        DB::connection('pgsql_privileged')->statement(
            'ALTER TABLE conversations ALTER COLUMN thread_kind DROP NOT NULL'
        );
        DB::connection('pgsql_privileged')->statement(
            'ALTER TABLE conversations ALTER COLUMN thread_kind DROP DEFAULT'
        );
    }
};
