<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * P08 — Projects core table.
 * Hybrid ID: owner_id/created_by/updated_by = bigint (users); all other FKs = uuid.
 * GIN index on custom_fields JSONB for custom-field queries (P02 pattern).
 * status_id → project_statuses (G11 — table owned by P01).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->integer('project_number');
            $table->string('name');
            $table->text('description')->nullable();
            $table->foreignUuid('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignUuid('status_id')->nullable()->constrained('project_statuses')->nullOnDelete();
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('team_id')->nullable()->constrained('teams')->nullOnDelete();
            $table->smallInteger('billing_type')->default(3); // 1=fixed, 2=hourly, 3=non_billable (M3)
            $table->date('start_date')->nullable();
            $table->date('deadline')->nullable();
            $table->timestampTz('finished_at')->nullable();
            $table->smallInteger('progress')->default(0); // 0–100
            $table->boolean('progress_from_tasks')->default(false);
            $table->boolean('is_pinned')->default(false);
            $table->boolean('visible_to_customer')->default(false);
            $table->jsonb('custom_fields')->default('{}');
            $table->integer('lock_version')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['workspace_id', 'project_number']);
            $table->index(['workspace_id', 'client_id']);
            $table->index(['workspace_id', 'status_id']);
            $table->index(['workspace_id', 'owner_id']);
        });

        // GIN index for custom_fields JSONB (P02 pattern)
        DB::statement('CREATE INDEX projects_custom_fields_gin ON projects USING gin(custom_fields)');
    }

    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
