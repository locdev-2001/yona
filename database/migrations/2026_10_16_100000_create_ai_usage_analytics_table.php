<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Số liệu tổng kết của nhân viên AI theo kỳ (giờ hoặc ngày, đầu kỳ theo UTC), cộng dồn
// ngay khi có lần gọi mô hình hoặc lượt kết thúc. ai_agent_id không có khoá ngoại: xoá
// nhân viên AI vẫn giữ số liệu của nó.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_usage_analytics', function (Blueprint $table) {
            $table->id();
            $table->string('period');
            $table->timestamp('period_start', 6);
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->bigInteger('ai_agent_id');
            $table->bigInteger('turns')->default(0);
            $table->bigInteger('replies')->default(0);
            $table->bigInteger('handoffs')->default(0);
            $table->bigInteger('failed_turns')->default(0);
            $table->bigInteger('model_calls')->default(0);
            $table->bigInteger('failed_calls')->default(0);
            $table->bigInteger('route_changes')->default(0);
            $table->bigInteger('latency_ms_total')->default(0);
            $table->bigInteger('input_tokens')->default(0);
            $table->bigInteger('output_tokens')->default(0);
            $table->bigInteger('cache_read_tokens')->default(0);
            $table->bigInteger('cache_write_tokens')->default(0);
            $table->bigInteger('cost_micro_usd')->default(0);
            $table->timestamps(6);

            // Tên tự sinh dài hơn 63 ký tự, Postgres sẽ cắt.
            $table->unique(['period', 'period_start', 'account_id', 'ai_agent_id'], 'ai_usage_analytics_period_key');
            $table->index(['account_id', 'period', 'period_start']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_usage_analytics');
    }
};
