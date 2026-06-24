<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// P07 — Lead entity. Workspace-scoped sales pipeline record.
// pipeline_id + stage_id: cross-pipeline invariant enforced at app layer (G8).
// custom_fields jsonb + GIN index (B3, C1). lead_number via WorkspaceSequence.
// last_stage_id: cache for lost/junk restore (not self-referencing leads, self-ref pipeline_stages).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leads', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->uuid('team_id')->nullable(); // visibility (no FK to avoid team-before-lead dep)

            // Human-readable sequence number per workspace
            $table->integer('lead_number')->default(0);

            // Core fields
            $table->string('name');
            $table->string('title')->nullable();      // job title of lead person
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('company')->nullable();
            $table->decimal('lead_value', 15, 2)->nullable();

            // Address
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('zip')->nullable();
            $table->string('country')->nullable();

            $table->string('website')->nullable();
            $table->text('description')->nullable();

            // Pipeline + stage (cross-pipeline invariant enforced at app layer G8)
            $table->foreignUuid('pipeline_id')->constrained('pipelines')->cascadeOnDelete();
            $table->foreignUuid('stage_id')->constrained('pipeline_stages')->cascadeOnDelete();
            $table->foreignUuid('source_id')->nullable()->constrained('lead_sources')->nullOnDelete();

            // Assignment
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();

            // Timestamps + conversion
            $table->timestamp('last_contact')->nullable();
            $table->timestamp('date_converted')->nullable();
            $table->uuid('converted_client_id')->nullable();   // no FK (client may be deleted)

            // Status flags
            $table->boolean('is_junk')->default(false);
            $table->boolean('is_lost')->default(false);
            $table->boolean('is_public')->default(false);

            // Kanban ordering
            $table->integer('lead_order')->default(0);

            // Stage cache for lost/junk restore (no cascade: stage may be deleted)
            $table->foreignUuid('last_stage_id')->nullable()->constrained('pipeline_stages')->nullOnDelete();

            // Custom fields JSONB bag (B3, C1)
            $table->jsonb('custom_fields')->default('{}');

            // System columns (A2)
            $table->integer('lock_version')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            // Unique: lead_number per workspace
            $table->unique(['workspace_id', 'lead_number']);

            // Composite indexes (workspace_id first per A3)
            $table->index(['workspace_id', 'pipeline_id', 'stage_id', 'lead_order']); // kanban query
            $table->index(['workspace_id', 'assigned_to']);   // visibility filter
            $table->index(['workspace_id', 'owner_id']);      // visibility filter
        });

        // GIN index for custom_fields — identical pattern to clients table (P06)
        DB::statement(
            'CREATE INDEX leads_custom_fields_gin ON leads USING gin (custom_fields jsonb_path_ops)'
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};
