<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * `conversation_members` — ai đang ở trong luồng nào.
 *
 * Thay cột `participants` jsonb: nghiệp vụ không sống trong JSON, và JSON không
 * trả lời được câu "người này ở những nhóm nào" mà không quét cả bảng.
 *
 * Ghi hàng cho CẢ 1-1 lẫn nhóm (1-1 đúng một hàng) để mọi câu hỏi "người này ở
 * đâu" chỉ có một đường trả lời.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversation_members', function (Blueprint $table) {
            $table->uuid('conversation_id');
            // Sự thật thô của nền tảng — luôn biết, kể cả khi chưa resolve ra người.
            $table->string('sender_uid');
            $table->uuid('workspace_id');
            $table->uuid('channel_account_id')->nullable();
            $table->uuid('identity_id')->nullable();
            $table->uuid('profile_id')->nullable();
            $table->timestamp('first_seen_at')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamp('left_at')->nullable();
            $table->timestamps();

            $table->primary(['conversation_id', 'sender_uid']);
        });

        // Covering index: "người này ở những nhóm nào" đọc xong ngay trong index,
        // không chạm bảng — và trả lời xuyên mọi kênh, không chỉ một tài khoản.
        DB::connection('pgsql_privileged')->statement(
            'CREATE INDEX conversation_members_ws_profile_idx
             ON conversation_members (workspace_id, profile_id)
             INCLUDE (conversation_id, last_seen_at)'
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('conversation_members');
    }
};
