<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Xóa các cột từng giữ thông tin cá nhân trên `conversations`.
 *
 * Từ đây, tên và số điện thoại của một con người chỉ có MỘT nguồn:
 * `profile_identities`. Giữ lại bản sao trên luồng là giữ lại đúng cái vấn đề
 * mà cả pha này tồn tại để giải — cùng một người, ba nơi, không nơi nào đúng.
 *
 * `thread_name`/`thread_avatar` KHÔNG bị xóa: chúng là tên của LUỒNG (với nhóm
 * thì là tên nhóm thật), không phải bản sao thông tin cá nhân.
 *
 * `sender_uid` cũng ở lại — nó là khóa thô của luồng, không phải thông tin cá nhân.
 *
 * Chỉ chạy sau khi hai migration dựng dữ liệu đã xác nhận không còn hàng sót.
 */
return new class extends Migration
{
    /** @var list<string> */
    private array $columns = [
        'peer_name',
        'peer_avatar_url',
        'peer_phone',
        'phone_source',
        'phone_verified_at',
        'phone_enriched_at',
        'participants',
    ];

    public function up(): void
    {
        $missing = (int) DB::connection('pgsql_privileged')->selectOne(
            "SELECT count(*) AS c FROM conversations
             WHERE thread_kind = 'direct' AND deleted_at IS NULL AND profile_id IS NULL"
        )->c;

        if ($missing !== 0) {
            throw new RuntimeException("Chưa xóa được: còn {$missing} luồng 1-1 chưa gắn hồ sơ.");
        }

        Schema::table('conversations', function (Blueprint $table) {
            $table->dropColumn($this->columns);
        });
    }

    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->string('peer_name')->nullable();
            $table->string('peer_avatar_url')->nullable();
            $table->string('peer_phone')->nullable();
            $table->string('phone_source')->nullable();
            $table->timestamp('phone_verified_at')->nullable();
            $table->timestamp('phone_enriched_at')->nullable();
            $table->jsonb('participants')->nullable();
        });
    }
};
