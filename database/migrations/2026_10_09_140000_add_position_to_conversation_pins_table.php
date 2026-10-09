<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Mỗi nhân viên tự xếp nhóm ghim của mình: số nhỏ đứng trên. Ghim sẵn có giữ
// đúng thứ tự đang hiện (hoạt động gần nhất trước).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversation_pins', function (Blueprint $table) {
            $table->integer('position')->default(0);
        });

        DB::statement(<<<'SQL'
            UPDATE conversation_pins
            SET position = ranked.position
            FROM (
                SELECT conversation_pins.id,
                       ROW_NUMBER() OVER (
                           PARTITION BY conversation_pins.account_id, conversation_pins.user_id
                           ORDER BY conversations.last_activity_at DESC NULLS FIRST, conversations.id DESC
                       ) - 1 AS position
                FROM conversation_pins
                JOIN conversations ON conversations.id = conversation_pins.conversation_id
            ) AS ranked
            WHERE ranked.id = conversation_pins.id
            SQL);

        Schema::table('conversation_pins', function (Blueprint $table) {
            $table->dropIndex(['account_id', 'user_id']);
            $table->index(['account_id', 'user_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::table('conversation_pins', function (Blueprint $table) {
            $table->dropIndex(['account_id', 'user_id', 'position']);
            $table->index(['account_id', 'user_id']);
            $table->dropColumn('position');
        });
    }
};
