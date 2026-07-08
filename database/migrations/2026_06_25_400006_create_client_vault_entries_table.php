<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// P06 (should) — Vault entries for storing encrypted credentials per client.
// password stored as encrypted cast at model layer (Laravel Crypt), NOT database-level
// encryption. DB stores the ciphertext string.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_vault_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignUuid('client_id')->constrained('clients')->cascadeOnDelete();

            $table->string('name');
            $table->string('server_address')->nullable();
            $table->string('port')->nullable();
            $table->string('username')->nullable();
            $table->text('password')->nullable(); // encrypted cast in model (Crypt)
            $table->text('description')->nullable();
            $table->boolean('share_in_projects')->default(false);
            $table->string('visibility')->default('private'); // private|shared

            // System columns (A2)
            $table->integer('lock_version')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['workspace_id', 'client_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_vault_entries');
    }
};
