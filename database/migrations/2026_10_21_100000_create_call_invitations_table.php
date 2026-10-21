<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Cuộc gọi nhóm có đổ chuông (`calls.kind = group_call`): mỗi thành viên được đổ chuông là một
// dòng `call_invitations` mang trạng thái riêng của họ. Tách khỏi `call_participants` vì nghe,
// từ chối, nhỡ là thao tác của người dùng trước khi vào phòng, còn `call_participants` chỉ ghi từ
// sự kiện phòng. Mỗi nhóm có tối đa một cuộc gọi nhóm đang diễn ra.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('call_invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('call_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status', 16);
            $table->timestamp('rang_at', 6);
            $table->timestamp('responded_at', 6)->nullable();
            $table->timestamps(6);

            $table->unique(['call_id', 'user_id']);
            $table->index(['call_id', 'status']);
        });

        DB::statement("ALTER TABLE call_invitations ADD CONSTRAINT call_invitations_status_check CHECK (status IN ('ringing', 'accepted', 'declined', 'missed'))");
        DB::statement('ALTER TABLE calls DROP CONSTRAINT calls_kind_check');
        DB::statement("ALTER TABLE calls ADD CONSTRAINT calls_kind_check CHECK (kind IN ('group_room', 'direct', 'group_call'))");
        DB::statement("CREATE UNIQUE INDEX calls_open_group_call_unique ON calls (yona_group_id) WHERE kind = 'group_call' AND ended_at IS NULL");
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS calls_open_group_call_unique');
        DB::statement("DELETE FROM calls WHERE kind = 'group_call'");
        DB::statement('ALTER TABLE calls DROP CONSTRAINT calls_kind_check');
        DB::statement("ALTER TABLE calls ADD CONSTRAINT calls_kind_check CHECK (kind IN ('group_room', 'direct'))");
        Schema::dropIfExists('call_invitations');
    }
};
