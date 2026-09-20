<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Chỉ mục tìm kiếm liên hệ/hội thoại dùng `gin_trgm_ops`, có trong extension
 * pg_trgm. DB dev đã bật tay từ trước nên thiếu bước này không lộ ra; mọi DB
 * tạo mới (test song song, máy dev mới, production mới) thì migrate chết ngay
 * ở migration tạo chỉ mục. Bật ở đây để không phải nhớ làm tay.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    }

    public function down(): void
    {
        // Không gỡ extension: có thể còn đối tượng khác trong DB đang dùng.
    }
};
