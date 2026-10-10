<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Giờ tin được gửi trên nền tảng, để thứ tự trong hội thoại khớp với app của kênh
// (webhook đến trễ, lô lịch sử). `created_at` vẫn là giờ Yona nhận: số chưa đọc và
// mốc hoạt động của hội thoại tính theo đó. Tin tạo trong Yona có hai giờ bằng nhau.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->timestamp('platform_sent_at')->nullable();
        });

        DB::statement('UPDATE messages SET platform_sent_at = created_at WHERE platform_sent_at IS NULL');

        Schema::table('messages', function (Blueprint $table) {
            $table->index(['conversation_id', 'platform_sent_at', 'id']);
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropIndex(['conversation_id', 'platform_sent_at', 'id']);
            $table->dropColumn('platform_sent_at');
        });
    }
};
