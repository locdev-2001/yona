<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * `profiles` — cái neo nói rằng những bí danh này là cùng một người.
 *
 * Bảng này KHÔNG giữ một trường cá nhân nào, và đó là toàn bộ lý do thiết kế:
 * gộp hồ sơ là việc hằng ngày (mọi khách lạ đều có hồ sơ, gặp SĐT trùng là gộp),
 * nên nó phải rẻ. Không có trường cá nhân ⇒ gộp không phải hòa giải gì ⇒ chỉ đổi
 * `profile_id` trên vài hàng bí danh.
 *
 * `profile_number` giống số căn cước: chỉ cấp khi đã định danh. Cấp cho cả khách
 * lạ thì số nhảy tới hàng trăm nghìn vì spam.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            // Cache suy ra từ bí danh — xem ProfileIdentificationService, nơi DUY NHẤT ghi cột này.
            $table->boolean('is_identified')->default(false);
            $table->integer('profile_number')->nullable();
            // Gộp = trỏ về hồ sơ gốc, KHÔNG xóa: gộp nhầm hai khách khác nhau thì còn hoàn tác được.
            $table->uuid('merged_into_id')->nullable();
            $table->timestamp('first_seen_at')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->jsonb('custom_fields')->default('{}');
            $table->timestamps();
            $table->softDeletes();
        });

        $db = DB::connection('pgsql_privileged');

        $db->statement('CREATE UNIQUE INDEX profiles_workspace_number_unique
            ON profiles (workspace_id, profile_number) WHERE profile_number IS NOT NULL');

        // Hai danh sách CRM, hai index riêng phần. Danh sách "chưa định danh" chứa
        // cả spam nên sẽ rất dài — tách ra thì nó không làm chậm danh sách kia.
        $db->statement('CREATE INDEX profiles_ws_identified_idx
            ON profiles (workspace_id, last_seen_at DESC)
            WHERE is_identified AND merged_into_id IS NULL AND deleted_at IS NULL');
        $db->statement('CREATE INDEX profiles_ws_unidentified_idx
            ON profiles (workspace_id, last_seen_at DESC)
            WHERE NOT is_identified AND merged_into_id IS NULL AND deleted_at IS NULL');
    }

    public function down(): void
    {
        Schema::dropIfExists('profiles');
    }
};
