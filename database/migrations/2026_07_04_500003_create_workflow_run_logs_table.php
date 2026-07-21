<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Automation — workflow_run_logs: append-only audit trail per step
 * (như audit_logs/messages) — trả lời "sao rule không chạy". Cũng là
 * nguồn dữ liệu cho loop-cap detection (đếm số lần node_id lặp lại
 * trong 1 run, xem WorkflowEngine::advance()).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workflow_run_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignUuid('workflow_run_id')->constrained('workflow_runs')->cascadeOnDelete();

            $table->string('node_id');
            $table->string('node_type', 32);
            $table->string('result', 16); // success|failed|skipped
            $table->text('message')->nullable();

            $table->timestamp('created_at')->useCurrent();

            $table->index(['workflow_run_id', 'created_at'], 'workflow_run_logs_run_created_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workflow_run_logs');
    }
};
