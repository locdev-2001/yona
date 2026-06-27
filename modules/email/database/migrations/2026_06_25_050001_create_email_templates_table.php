<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P05 — Email Templates (C4).
 *
 * Workspace-scoped catalog of email templates with merge-field support.
 * slug + language together are unique per workspace — allows vi/en variants.
 * type groups templates in the admin UI (leads, clients, contacts, etc.).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();

            $table->string('slug');                       // catalog key, e.g. lead_assigned
            $table->string('type');                       // UI grouping: leads|clients|contacts|projects|tasks|staff
            $table->string('name');                       // human label for admin
            $table->string('subject');                    // may contain {tokens}
            $table->text('body');                         // HTML body, may contain {tokens}
            $table->string('language', 8)->default('vi'); // vi|en
            $table->boolean('plaintext')->default(false); // strip HTML when sending
            $table->boolean('active')->default(true);     // false = skip silently
            $table->integer('sort_order')->default(0);

            $table->integer('lock_version')->default(0);  // BR-X08 optimistic concurrency
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            // One template per (workspace, slug, language) — multi-language support.
            $table->unique(['workspace_id', 'slug', 'language']);
            // Fast lookup by type within a workspace.
            $table->index(['workspace_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_templates');
    }
};
