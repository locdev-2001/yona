<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Pipelines: workspace-scoped lead funnels (BR-X02). At most one default per
// workspace — enforced by LookupService (service-layer single-default guard).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pipelines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->string('name');
            $table->boolean('is_default')->default(false);
            $table->integer('lock_version')->default(0); // BR-X08 optimistic concurrency
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['workspace_id', 'name']);
            $table->index(['workspace_id', 'is_default']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pipelines');
    }
};
