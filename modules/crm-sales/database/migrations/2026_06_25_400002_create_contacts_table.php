<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// P06 — Contact entity (person, belongs to one client, many per client, 1 primary).
// G10 — partial unique index on (workspace_id, email) WHERE email IS NOT NULL AND
// deleted_at IS NULL. Blueprint unique() cannot express partial — must use DB::statement.
// G12 — portal cols (password, email_verified_at, is_active, email_optin) nullable,
// created here to avoid breaking migration later. NEVER expose in Inertia/resource.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contacts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignUuid('client_id')->constrained('clients')->cascadeOnDelete();

            // Business fields
            $table->string('first_name');
            $table->string('last_name')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('title')->nullable();
            $table->boolean('is_primary')->default(false);
            $table->string('language', 8)->nullable(); // vi|en (G1); empty → fallback Client.default_language (G12)

            // Portal columns — M2 scope, NULLABLE, NEVER expose via Inertia/resource (G12)
            $table->string('password')->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->jsonb('email_optin')->default('{}'); // opt-in toggles (should)

            // Custom fields JSONB bag (B3, C1)
            $table->jsonb('custom_fields')->default('{}');

            // System columns (A2)
            $table->integer('lock_version')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            // Composite index workspace → client
            $table->index(['workspace_id', 'client_id']);
        });

        // G10 — partial unique index: allow multiple NULLs + soft-deleted dups,
        // block only active rows with same non-null email in same workspace.
        // Blueprint unique() generates a full index (no WHERE clause) — must use statement.
        DB::statement(
            'CREATE UNIQUE INDEX contacts_workspace_email_unique ON contacts (workspace_id, email) WHERE email IS NOT NULL AND deleted_at IS NULL'
        );

        // GIN index for custom_fields JSONB
        DB::statement(
            'CREATE INDEX contacts_custom_fields_gin ON contacts USING gin (custom_fields jsonb_path_ops)'
        );
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS contacts_workspace_email_unique');
        DB::statement('DROP INDEX IF EXISTS contacts_custom_fields_gin');
        Schema::dropIfExists('contacts');
    }
};
