<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// comments: polymorphic comments for any workspace entity (P03).
// parent_id enables 1-level thread replies (task comments, project discussions).
// contact_id unconstrained until contacts table (P06).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('comments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();

            $table->string('commentable_type');
            $table->uuid('commentable_id');

            $table->uuid('parent_id')->nullable(); // self-ref FK added after create (see below)

            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->uuid('contact_id')->nullable(); // unconstrained until contacts table (P06)

            $table->text('body');
            $table->boolean('visible_to_customer')->default(false);

            $table->integer('lock_version')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['workspace_id', 'commentable_type', 'commentable_id']);
            $table->index(['workspace_id', 'parent_id']);
        });

        // Self-referencing FK added after the table (and its PK) exists — same pattern as teams.
        Schema::table('comments', function (Blueprint $table) {
            $table->foreign('parent_id')->references('id')->on('comments')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comments');
    }
};
