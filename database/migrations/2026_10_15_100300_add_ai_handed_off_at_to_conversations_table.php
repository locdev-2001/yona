<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// ai_handed_off_at: AI agent đã chuyển hội thoại cho người (hoặc lượt AI lỗi) và chưa có
// người tiếp nhận. Xoá khi bật lại AI hoặc khi gán cho một nhân viên. Index một phần vì
// chỉ một phần rất nhỏ hội thoại đang chờ người.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->timestamp('ai_handed_off_at', 6)->nullable();
        });

        DB::statement('CREATE INDEX index_conversations_on_account_id_ai_handed_off ON conversations (account_id) WHERE ai_handed_off_at IS NOT NULL');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS index_conversations_on_account_id_ai_handed_off');

        Schema::table('conversations', function (Blueprint $table) {
            $table->dropColumn('ai_handed_off_at');
        });
    }
};
