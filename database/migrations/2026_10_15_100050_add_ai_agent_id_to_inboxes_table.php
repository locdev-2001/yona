<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// AI agent phụ trách inbox: trả lời các hội thoại bật tự động của inbox này. Một inbox
// tối đa một AI agent, một AI agent gắn được nhiều inbox; cùng account do dịch vụ kiểm.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inboxes', function (Blueprint $table) {
            $table->foreignId('ai_agent_id')->nullable()->constrained()->nullOnDelete();
            $table->index('ai_agent_id');
        });
    }

    public function down(): void
    {
        Schema::table('inboxes', function (Blueprint $table) {
            $table->dropForeign(['ai_agent_id']);
            $table->dropIndex(['ai_agent_id']);
            $table->dropColumn('ai_agent_id');
        });
    }
};
