<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Một nhóm có nhiều phòng thoại đặt tên, quản trị nhóm tạo/đổi tên/xoá. Phòng trỏ tới cuộc gọi
// đang mở của nó (`open_call_id`); bảng `calls` không biết phòng. Mỗi nhóm không còn giới hạn
// một phòng mở: index một-phòng-mở-mỗi-nhóm thay bằng khoá dòng phòng lúc mở cuộc gọi.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('yona_group_voice_rooms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('yona_group_id')->constrained()->cascadeOnDelete();
            $table->string('name', 60)->nullable();
            $table->integer('position')->default(0);
            $table->foreignId('created_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('open_call_id')->nullable()->unique()->constrained('calls')->nullOnDelete();
            $table->timestamps(6);

            $table->index(['yona_group_id', 'position']);
        });

        DB::statement('DROP INDEX IF EXISTS calls_open_group_room_unique');
    }

    public function down(): void
    {
        Schema::dropIfExists('yona_group_voice_rooms');
        DB::statement("CREATE UNIQUE INDEX IF NOT EXISTS calls_open_group_room_unique ON calls (yona_group_id) WHERE kind = 'group_room' AND ended_at IS NULL");
    }
};
