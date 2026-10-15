<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Nhật ký mỗi lần gọi API nhà cung cấp mô hình: để soi lỗi, đo token và chi phí.
// Chứa nội dung hội thoại nên chỉ giữ 30 ngày (ApiLog::prunable).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('api_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('conversation_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('ai_agent_id')->nullable()->constrained()->nullOnDelete();
            $table->string('provider');
            $table->string('model');
            $table->integer('http_status')->nullable();
            $table->string('error_code')->nullable();
            $table->jsonb('request');
            $table->jsonb('response')->nullable();
            $table->integer('input_tokens')->default(0);
            $table->integer('output_tokens')->default(0);
            $table->integer('cache_read_tokens')->default(0);
            $table->integer('cache_write_tokens')->default(0);
            $table->bigInteger('cost_micro_usd')->default(0);
            $table->integer('latency_ms')->default(0);
            $table->timestamp('created_at', 6)->useCurrent();

            $table->index(['account_id', 'created_at']);
            $table->index(['conversation_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('api_logs');
    }
};
