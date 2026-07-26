<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Bước 1/3 — thêm cột `thread_kind`, chưa điền gì.
 *
 * `thread_type` là số nguyên của Zalo (0/1). Cột mới nói bằng tiếng của sản
 * phẩm: `direct` / `group` — đọc là hiểu, và không khóa cứng ở hai giá trị
 * (Slack/Discord còn loại thứ ba).
 *
 * Nullable và KHÔNG default là cố ý: default sẽ điền `direct` cho mọi hội thoại
 * nhóm đang có, và không cách nào phân biệt "chưa điền" với "đã điền là direct"
 * ở bước backfill. Cột chỉ thành NOT NULL ở bước 3, sau khi backfill xác nhận
 * không còn dòng rỗng.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->string('thread_kind')->nullable()->after('thread_type');
        });
    }

    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropColumn('thread_kind');
        });
    }
};
