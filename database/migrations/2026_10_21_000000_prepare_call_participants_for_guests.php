<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Người trong phòng không nhất thiết là người dùng Yona (khách của cuộc họp vào bằng tên): mỗi
// lần vào phòng ghi theo định danh trung tính `identity` (`user:{id}` | `guest:{key}`) và tên
// hiển thị lúc vào; `user_id` chỉ có khi đó là người dùng. Thêm loại `meeting` vào CHECK `kind`.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('call_participants', function (Blueprint $table) {
            $table->string('identity', 80)->nullable()->after('user_id');
            $table->string('display_name', 100)->nullable()->after('identity');
        });

        DB::statement("UPDATE call_participants SET identity = 'user:' || user_id WHERE identity IS NULL");

        Schema::table('call_participants', function (Blueprint $table) {
            $table->string('identity', 80)->nullable(false)->change();
            $table->unsignedBigInteger('user_id')->nullable()->change();
        });

        DB::statement('ALTER TABLE calls DROP CONSTRAINT calls_kind_check');
        DB::statement("ALTER TABLE calls ADD CONSTRAINT calls_kind_check CHECK (kind IN ('group_room', 'direct', 'meeting'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE calls DROP CONSTRAINT calls_kind_check');
        DB::statement("ALTER TABLE calls ADD CONSTRAINT calls_kind_check CHECK (kind IN ('group_room', 'direct'))");

        DB::statement('DELETE FROM call_participants WHERE user_id IS NULL');

        Schema::table('call_participants', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
            $table->dropColumn(['identity', 'display_name']);
        });
    }
};
