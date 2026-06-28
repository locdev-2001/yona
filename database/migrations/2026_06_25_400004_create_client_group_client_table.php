<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// P06 — Pivot: many-to-many client ↔ client_group.
// G4 — MUST carry workspace_id for RLS coverage (pivot tables need workspace_id
// to be included in RLS batch + RlsPolicyCoverageTest whitelist).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_group_client', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignUuid('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignUuid('client_group_id')->constrained('client_groups')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['client_id', 'client_group_id']);
            $table->index(['workspace_id', 'client_group_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_group_client');
    }
};
