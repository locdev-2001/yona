<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Additive: conversations.participants — hồ sơ thành viên nhóm keyed theo sender_uid
 * ({uid: {name, avatar}}), upsert từ mỗi tin live inbound có sender profile.
 * FE tra map này theo message.sender_uid để hiện avatar/tên người gửi trong nhóm —
 * áp hồi tố cho cả tin backfill (bridge backfill không resolve profile).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->jsonb('participants')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropColumn('participants');
        });
    }
};
