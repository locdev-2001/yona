<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Per-workspace human-readable counters (Deal #1234, Ticket #5678 — arch §9c).
// Atomic increment via INSERT ... ON CONFLICT DO UPDATE RETURNING.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workspace_sequences', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->string('entity'); // deal|ticket|...
            $table->bigInteger('next_value')->default(1);
            $table->timestamps();

            $table->unique(['workspace_id', 'entity']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workspace_sequences');
    }
};
