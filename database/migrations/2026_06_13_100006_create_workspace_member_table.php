<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Membership = the workspace-scoped join between a global user and a workspace.
// role + team + status live HERE, server-controlled (BR-X12). A user joins N
// workspaces. Deactivation is a status change (BR-X03), never a user delete.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workspace_member', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role'); // admin|sales_manager|sales_rep|support_manager|support_agent|marketer|viewer
            $table->foreignUuid('team_id')->nullable()->constrained('teams')->nullOnDelete();
            $table->string('status')->default('invited'); // active|invited|deactivated
            $table->timestampTz('invited_at')->nullable();
            $table->timestampTz('joined_at')->nullable();
            $table->integer('lock_version')->default(0); // BR-X08
            $table->timestamps();

            $table->unique(['workspace_id', 'user_id']);
            $table->index(['workspace_id', 'status']);
            $table->index(['workspace_id', 'team_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workspace_member');
    }
};
