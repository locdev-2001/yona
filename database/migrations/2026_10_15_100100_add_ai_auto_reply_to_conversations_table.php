<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// - ai_auto_reply: công tắc tự động; AI agent của inbox (nếu đang bật) trả lời.
// - floor_held_until: AI đang giữ quyền nói công khai tới mốc này; người không gửi được
//   tin công khai cho tới khi nhả hoặc quá hạn. Quá hạn là tự hết, worker chết không
//   khoá hội thoại mãi.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->boolean('ai_auto_reply')->default(false);
            $table->timestamp('floor_held_until', 6)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropColumn(['ai_auto_reply', 'floor_held_until']);
        });
    }
};
