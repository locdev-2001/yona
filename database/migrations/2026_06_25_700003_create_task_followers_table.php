<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P09 — Task followers pivot (should — create table but UI optional).
 * Used for notifications (assignees + followers + creator notified on comments).
 * Hybrid ID: user FK = bigint (A2). Workspace-scoped (G4 RLS in 700006).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_followers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->foreignUuid('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['workspace_id', 'task_id', 'user_id']);
            $table->index(['workspace_id', 'task_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_followers');
    }
};
