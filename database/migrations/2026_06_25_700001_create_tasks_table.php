<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * P09 — Tasks: polymorphic related-to, status/priority const enum (no DB enum),
 * custom_fields JSONB with GIN index, kanban_order per status column.
 * Hybrid ID: task uuid PK, user FKs bigint (A2).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();

            // Human-readable task number per workspace (WorkspaceSequence::next)
            $table->integer('task_number')->default(0);

            $table->string('name');
            $table->text('description')->nullable();

            // Status const 1-5; priority const 1-4 — NEVER DB enum/CHECK (A3)
            $table->unsignedTinyInteger('status')->default(1);
            $table->unsignedTinyInteger('priority')->default(2);

            $table->date('start_date')->nullable();
            $table->date('due_date')->nullable();
            $table->timestamp('finished_at')->nullable();

            // Polymorphic related-to: placed as 2 manual cols (uuid related_id, string alias related_type)
            // NOT morphs() helper (which forces integer+string; we need uuid FK target)
            $table->string('related_type')->nullable(); // alias: lead|client|project|contact (G3)
            $table->uuid('related_id')->nullable();

            $table->foreignUuid('milestone_id')
                ->nullable()
                ->constrained('project_milestones')
                ->nullOnDelete();

            $table->boolean('billable')->default(false);
            $table->boolean('billed')->default(false);
            $table->decimal('hourly_rate', 15, 2)->nullable();
            $table->boolean('visible_to_customer')->default(false);

            // Kanban column order per status; set by service on status change
            $table->integer('kanban_order')->default(0);

            // Custom fields JSONB bag (P02, B3) — GIN index added via statement below
            $table->jsonb('custom_fields')->default('{}');

            // System columns (A2)
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('team_id')->nullable()->constrained('teams')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->integer('lock_version')->default(0);
            $table->timestamps();
            $table->softDeletes();

            // Indexes (workspace_id leading — A3)
            $table->unique(['workspace_id', 'task_number']);
            $table->index(['workspace_id', 'status', 'kanban_order']);
            $table->index(['workspace_id', 'related_type', 'related_id']);
            $table->index(['workspace_id', 'milestone_id']);
            $table->index(['workspace_id', 'owner_id']);
        });

        // GIN index for JSONB queries on custom_fields (P02 convention)
        DB::statement('CREATE INDEX tasks_custom_fields_gin ON tasks USING GIN (custom_fields)');
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
