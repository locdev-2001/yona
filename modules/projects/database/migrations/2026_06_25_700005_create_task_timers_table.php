<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * P09 — Task timers (timesheets). Running timer = end_time IS NULL.
 * Partial unique index enforces max 1 running timer per user per workspace (backstop).
 * Workspace-scoped (G4 RLS in 700006). Hybrid ID: user FK = bigint (A2).
 * No SoftDeletes — timesheet immutable; hard delete only via TaskTimerService guard.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_timers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->foreignUuid('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('start_time');
            $table->timestamp('end_time')->nullable(); // null = running
            $table->decimal('hourly_rate', 15, 2)->nullable();
            $table->string('note')->nullable();
            $table->timestamps();

            $table->index(['workspace_id', 'task_id']);
            $table->index(['workspace_id', 'user_id']);
        });

        // Partial unique index: max 1 running timer per (workspace, user).
        // WHERE end_time IS NULL means stopped timers are NOT included in uniqueness check.
        // This is the DB backstop; TaskTimerService::start() also guards this at app layer.
        DB::statement(
            'CREATE UNIQUE INDEX task_timers_one_running_per_user '.
            'ON task_timers (workspace_id, user_id) WHERE end_time IS NULL'
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('task_timers');
    }
};
