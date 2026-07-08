<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P05 (inbox-multichannel-relayer) — additive: conversations.stream_version,
 * tăng mỗi message insert VÀ mỗi conversation_event insert. FE dùng để biết
 * khi nào cần refetch window quanh cursor (chèn gap lịch sử vào vùng đã tải).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->unsignedInteger('stream_version')->default(0)->after('lock_version');
        });
    }

    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropColumn('stream_version');
        });
    }
};
