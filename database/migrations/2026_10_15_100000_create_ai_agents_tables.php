<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// AI agent: thành viên máy của account, tự trả lời và đứng tên tin gửi đi như một
// nhân viên. Lõi không biết bộ não nào đứng sau. Một account có nhiều AI agent; mỗi
// inbox gắn tối đa một (inboxes.ai_agent_id). Khác `agent_bots` (bot webhook cũ).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_agents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('persona')->nullable();
            $table->text('instructions')->nullable();
            $table->boolean('enabled')->default(true);
            $table->timestamps(6);

            $table->index('account_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_agents');
    }
};
