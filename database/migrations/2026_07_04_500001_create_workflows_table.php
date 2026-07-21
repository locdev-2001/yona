<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Automation — workflows: trigger→condition→action graph definition.
 * graph jsonb {nodes,edges} — 1 rule đơn giản = graph 3 node, không tách
 * bảng riêng cho rule vs workflow (docs/crm-automation-workflow.md).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workflows', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();

            $table->string('name');
            $table->jsonb('graph')->default('{"nodes":[],"edges":[]}');
            $table->boolean('is_active')->default(false);

            $table->integer('lock_version')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['workspace_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workflows');
    }
};
