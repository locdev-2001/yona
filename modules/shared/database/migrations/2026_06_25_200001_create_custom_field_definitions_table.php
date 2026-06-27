<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Custom-field definitions registry (P02, B3). No EAV — only metadata here;
// values live in entity.custom_fields JSONB (key = slug). Slug is immutable
// after creation; field_type and entity_type are locked server-side in service.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('custom_field_definitions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->string('entity_type', 30);   // whitelist enforced in app layer (G6)
            $table->string('name', 150);
            $table->string('slug', 150);          // auto-generated, immutable after create
            $table->string('field_type', 20);     // whitelist enforced in app layer (G6)
            $table->jsonb('options')->default('[]');       // only for select/multiselect/checkbox
            $table->jsonb('default_value')->nullable();   // type-aware, coerced on save
            $table->boolean('required')->default(false);
            $table->boolean('active')->default(true);
            $table->integer('field_order')->default(0);
            $table->integer('bs_column')->default(12);     // 1..12 layout width (should)
            $table->boolean('show_on_table')->default(false);
            $table->boolean('show_on_client_portal')->default(false); // enforce M2
            $table->boolean('disallow_client_edit')->default(false);  // enforce M2
            $table->boolean('only_admin')->default(false);
            $table->integer('lock_version')->default(0);  // BR-X08 optimistic concurrency
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            // slug must be unique per workspace + entity_type combination
            $table->unique(['workspace_id', 'entity_type', 'slug']);
            // ordered list query: workspace → entity_type → active → field_order
            $table->index(['workspace_id', 'entity_type', 'active', 'field_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('custom_field_definitions');
    }
};
