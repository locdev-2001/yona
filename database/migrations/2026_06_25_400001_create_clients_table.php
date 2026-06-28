<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// P06 — Client (company) entity. Billing + shipping flat cols (structured,
// not JSON blob) for easy invoice override at M3. currency = string code (B5/G12).
// custom_fields jsonb + GIN index (B3, C1). leadid nullable — no FK because lead
// may be deleted after convert (P07). No unique on name (allow dup company names).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->uuid('team_id')->nullable(); // visibility (no FK to avoid team-before-client dep)

            // Business fields
            $table->string('name');
            $table->string('vat')->nullable();
            $table->string('phone')->nullable();
            $table->string('website')->nullable();
            $table->string('currency', 8)->nullable();          // string code (B5/G12), not FK
            $table->string('default_language', 8)->nullable();  // vi|en (G1)

            // Billing address (flat, not JSON — easier to query + override at M3)
            $table->string('billing_street')->nullable();
            $table->string('billing_city')->nullable();
            $table->string('billing_state')->nullable();
            $table->string('billing_zip')->nullable();
            $table->string('billing_country')->nullable();

            // Shipping address
            $table->string('shipping_street')->nullable();
            $table->string('shipping_city')->nullable();
            $table->string('shipping_state')->nullable();
            $table->string('shipping_zip')->nullable();
            $table->string('shipping_country')->nullable();

            // Source reference — no FK (lead may be deleted after convert, P07)
            $table->uuid('leadid')->nullable();

            // Custom fields JSONB bag (B3, C1)
            $table->jsonb('custom_fields')->default('{}');

            // System columns (A2)
            $table->integer('lock_version')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            // Composite indexes (workspace_id first per A3)
            $table->index(['workspace_id', 'owner_id']);
            $table->index(['workspace_id', 'name']);
        });

        // GIN index for custom_fields — Blueprint rawIndex may not emit correct syntax
        // so use DB::statement for cross-version safety (same pattern as P02).
        DB::statement(
            'CREATE INDEX clients_custom_fields_gin ON clients USING gin (custom_fields jsonb_path_ops)'
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
