<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// P06 — Pivot: customer-admin delegation (client → users).
// B1 — no separate staff table; customer-admins = workspace users (bigint FK).
// G4 — workspace_id required for RLS coverage + RlsPolicyCoverageTest whitelist.
// user_id is bigint (foreignId) per hybrid-ID rule (A2).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_user', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignUuid('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete(); // bigint (A2 hybrid-ID)
            $table->timestamps();

            $table->unique(['client_id', 'user_id']);
            $table->index(['workspace_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_user');
    }
};
