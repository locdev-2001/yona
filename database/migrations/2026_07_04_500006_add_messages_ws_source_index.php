<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P02 review MED-1 — lookup source_id per-account (message-state events không
 * mang conversation_id): unique cũ (conversation_id, source_id) không dẫn đầu
 * bằng source_id → seq scan. RLS luôn inject workspace filter → index
 * (workspace_id, source_id) dùng được cho mọi truy vấn state-event.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->index(['workspace_id', 'source_id'], 'messages_ws_source_idx');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropIndex('messages_ws_source_idx');
        });
    }
};
