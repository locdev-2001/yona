<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * `profile_identities` — mọi bí danh của một người, và mọi thông tin cá nhân.
 *
 * Ba cột dễ lẫn vì chúng trả lời ba câu khác nhau:
 *   key + value  — bí danh này LÀ GÌ          (phone / 0901234567)
 *   source       — ta BIẾT ĐƯỢC TỪ ĐÂU        (haravan)
 *   channels     — người này ĐANG DÙNG KÊNH NÀO (["zalo","messenger"])
 *
 * `channels` là mảng và KHÔNG suy ra được từ `key`: "số này có Zalo không" là sự
 * thật phải kiểm chứng, không phải quy tắc.
 *
 * `display_name` tách thành cột thật vì tìm khách theo tên là việc hằng ngày mà
 * json không index tìm kiếm được.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profile_identities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            // Khách lạ CŨNG có hồ sơ, nên cột này không nullable.
            $table->uuid('profile_id');
            $table->string('key');
            $table->string('value');
            $table->string('source');
            $table->uuid('channel_account_id')->nullable();
            $table->jsonb('channels')->default('[]');
            $table->string('display_name')->nullable();
            $table->jsonb('channel_profiles')->default('{}');
            $table->jsonb('attributes')->default('{}');
            // Phân biệt SĐT đã xác minh với SĐT đoán từ danh thiếp.
            $table->boolean('is_verified')->default(false);
            $table->timestamp('first_seen_at')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();

            $table->index('profile_id');
            $table->index(['workspace_id', 'display_name']);
        });

        $db = DB::connection('pgsql_privileged');

        // Một SĐT = một người trong một workspace. Đây CHÍNH LÀ quy tắc chống
        // trùng theo số điện thoại — một luật, không phải hai cơ chế song song.
        $db->statement('CREATE UNIQUE INDEX profile_identities_ws_key_value_unique
            ON profile_identities (workspace_id, key, value) WHERE channel_account_id IS NULL');

        // uid của kênh chỉ duy nhất trong phạm vi MỘT tài khoản kênh: cùng một
        // chuỗi psid có thể thuộc hai người khác nhau trên hai trang khác nhau.
        $db->statement('CREATE UNIQUE INDEX profile_identities_account_key_value_unique
            ON profile_identities (channel_account_id, key, value) WHERE channel_account_id IS NOT NULL');

        $db->statement('CREATE INDEX profile_identities_channels_idx
            ON profile_identities USING gin (channels jsonb_path_ops)');
        $db->statement('CREATE INDEX profile_identities_attributes_idx
            ON profile_identities USING gin (attributes jsonb_path_ops)');
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_identities');
    }
};
