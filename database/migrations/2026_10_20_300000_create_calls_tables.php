<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Cuộc gọi: mỗi phòng thoại nhóm hoặc cuộc gọi 1-1 là một dòng `calls`, mỗi lần một
// người vào/ra phòng là một dòng `call_participants`. Không cột nào trỏ vào nhà cung
// cấp media cụ thể: tên phòng phía nhà cung cấp là `calls.uuid`.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calls', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('kind', 16);
            $table->foreignId('yona_group_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('caller_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('callee_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('pair_key', 41)->nullable();
            $table->string('media', 8);
            $table->string('status', 16);
            $table->timestamp('started_at', 6)->nullable();
            $table->timestamp('answered_at', 6)->nullable();
            $table->timestamp('ended_at', 6)->nullable();
            $table->smallInteger('peak_participants')->default(0);
            $table->timestamps(6);
        });

        Schema::create('call_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('call_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('joined_at', 6);
            $table->timestamp('left_at', 6)->nullable();
            $table->timestamps(6);

            $table->index(['call_id', 'left_at']);
        });

        DB::statement("CREATE UNIQUE INDEX calls_open_group_room_unique ON calls (yona_group_id) WHERE kind = 'group_room' AND ended_at IS NULL");
        DB::statement("CREATE UNIQUE INDEX calls_live_pair_unique ON calls (pair_key) WHERE status IN ('ringing', 'active')");
        DB::statement("ALTER TABLE calls ADD CONSTRAINT calls_kind_check CHECK (kind IN ('group_room', 'direct'))");
        DB::statement("ALTER TABLE calls ADD CONSTRAINT calls_media_check CHECK (media IN ('audio', 'video'))");
        DB::statement("ALTER TABLE calls ADD CONSTRAINT calls_status_check CHECK (status IN ('ringing', 'active', 'ended', 'missed', 'declined', 'cancelled'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('call_participants');
        Schema::dropIfExists('calls');
    }
};
