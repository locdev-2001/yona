<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// GLOBAL — no workspace_id, no RLS, no BelongsToWorkspace.
// Announcements are platform-wide; tenant users read them across workspaces.
// FK to admins uses bigint (hybrid ID 13a); id is uuid (HasUuids).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('announcements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('body');
            $table->text('body_html');
            $table->string('category');
            $table->string('status')->default('draft');
            $table->timestampTz('published_at')->nullable();
            $table->jsonb('audience')->default(json_encode(['type' => 'all']));
            $table->string('cover_image', 2000)->nullable();
            $table->foreignId('created_by')->constrained('admins')->restrictOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('admins')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'published_at']);
            $table->index('published_at');
        });

        // Partial unique index: slug must be unique among non-deleted rows only,
        // allowing soft-deleted slugs to be reused.
        DB::statement(
            'CREATE UNIQUE INDEX announcements_slug_active_unique ON announcements (slug) WHERE deleted_at IS NULL'
        );

        // DB-level guard: v1 only allows audience type=all (defense-in-depth).
        DB::statement(
            "ALTER TABLE announcements ADD CONSTRAINT announcements_audience_type_check CHECK ((audience->>'type') = 'all')"
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('announcements');
    }
};
