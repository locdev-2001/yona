<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Closure table for O(1) team subtree reads (manager rollup, BR-X02). One row
// per (ancestor, descendant) incl. self (depth 0). Maintained on create/reparent.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('team_closure', function (Blueprint $table) {
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignUuid('ancestor_id')->constrained('teams')->cascadeOnDelete();
            $table->foreignUuid('descendant_id')->constrained('teams')->cascadeOnDelete();
            $table->integer('depth');

            $table->primary(['ancestor_id', 'descendant_id']);
            $table->index(['workspace_id', 'ancestor_id']);
            $table->index(['workspace_id', 'descendant_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('team_closure');
    }
};
