<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Pipeline stages: ordered steps inside a pipeline. type ∈ {open,won,lost}
// stored as string (no DB enum). Cross-pipeline guard (G8) enforced at app layer.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pipeline_stages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignUuid('pipeline_id')->constrained('pipelines')->cascadeOnDelete();
            $table->string('name');
            $table->string('color')->nullable(); // hex e.g. #3b82f6
            $table->integer('stage_order')->default(0);
            $table->unsignedTinyInteger('probability')->default(0); // 0–100
            $table->string('type')->default('open'); // open|won|lost — no DB enum/CHECK
            $table->integer('lock_version')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['workspace_id', 'pipeline_id', 'name']);
            // Composite index supports G8 cross-pipeline guard queries
            $table->index(['workspace_id', 'pipeline_id', 'stage_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pipeline_stages');
    }
};
