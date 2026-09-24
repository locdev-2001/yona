<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Bảng `reporting_events` (sự kiện thô,
// nguồn duy nhất của mọi số liệu báo cáo) và `reporting_events_rollups` (tổng
// hợp theo ngày × chiều × chỉ số).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reporting_events', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
            $table->float('value')->nullable();
            $table->foreignId('account_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('inbox_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('conversation_id')->nullable()->constrained()->cascadeOnDelete();
            $table->float('value_in_business_hours')->nullable();
            $table->timestamp('event_start_time', 6)->nullable();
            $table->timestamp('event_end_time', 6)->nullable();
            $table->timestamps(6);

            $table->index(['account_id', 'name', 'created_at'], 'reporting_events__account_id__name__created_at');
            $table->index(['account_id', 'name', 'inbox_id', 'created_at'], 'index_reporting_events_for_response_distribution');
            $table->index('created_at', 'index_reporting_events_on_created_at');
            $table->index('name', 'index_reporting_events_on_name');
        });

        Schema::create('reporting_events_rollups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->string('dimension_type');
            $table->unsignedBigInteger('dimension_id');
            $table->string('metric');
            $table->unsignedBigInteger('count')->default(0);
            $table->float('sum_value')->default(0);
            $table->float('sum_value_business_hours')->default(0);
            $table->timestamps(6);

            $table->unique(['account_id', 'date', 'dimension_type', 'dimension_id', 'metric'], 'index_rollup_unique_key');
            $table->index(['account_id', 'dimension_type', 'date'], 'index_rollup_summary');
            $table->index(['account_id', 'metric', 'date'], 'index_rollup_timeseries');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reporting_events_rollups');
        Schema::dropIfExists('reporting_events');
    }
};
