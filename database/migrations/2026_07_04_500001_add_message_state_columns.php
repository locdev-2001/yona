<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P01a (inbox-full-messaging-framework) — trạng thái tin đi-theo-messages (taxonomy loại 2).
 *
 * recalled_at/delivered_at/seen_at: scalar semantics cho thread 1-1, direction=out.
 * Nhóm là per-member (seenUids) — P02 guard bỏ qua thread_type=1, KHÔNG dùng cột này.
 *
 * platform_meta.zca_message: subset raw từ listener zca đủ 14 field cho outbound action
 * (quote cần content/msgType/propertyExt/uidFrom/msgId/cliMsgId/ts/ttl; reaction cần
 * msgId+cliMsgId; seen cần msgId/cliMsgId/uidFrom/idTo/msgType/st/at/cmd/ts).
 * Tin CŨ trước migration: platform_meta = '{}' → P06 disable action có lý do.
 *
 * jsonb default '{}' trên bảng lớn: Postgres ≥11 không rewrite table (default non-volatile).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->timestamp('recalled_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('seen_at')->nullable();
            $table->jsonb('platform_meta')->default('{}');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn(['recalled_at', 'delivered_at', 'seen_at', 'platform_meta']);
        });
    }
};
