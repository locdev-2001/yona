<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Workspace-scoped reminders with polymorphic subject. Full system columns
// (A2): lock_version, created_by/updated_by, timestamps, softDeletes.
// Scheduler uses (remind_at, is_notified) cross-workspace — no workspace_id
// prefix on that index so the scheduler can scan efficiently.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reminders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();

            // Polymorphic subject (lead, client, project, task…)
            $table->string('remindable_type');
            $table->uuid('remindable_id');

            // Recipient: the user to be reminded
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            $table->text('description');
            $table->timestampTz('remind_at');
            $table->boolean('is_notified')->default(false);
            $table->timestampTz('notified_at')->nullable();

            // System columns (A2)
            $table->integer('lock_version')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            // Subject-scoped queries (list reminders for a given entity)
            $table->index(['workspace_id', 'remindable_type', 'remindable_id'], 'reminders_subject_idx');
            // My reminders view (user + time, within workspace)
            $table->index(['workspace_id', 'user_id', 'remind_at'], 'reminders_user_idx');
            // Scheduler cross-workspace sweep — no workspace_id prefix intentional
            $table->index(['remind_at', 'is_notified'], 'reminders_scheduler_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reminders');
    }
};
