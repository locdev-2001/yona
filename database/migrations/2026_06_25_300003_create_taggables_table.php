<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// taggables: polymorphic pivot linking tags to any entity.
// workspace_id is mandatory for RLS WITH CHECK on pivot inserts.
// order preserves Perfex tag_order on each taggable entity.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('taggables', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignUuid('tag_id')->constrained('tags')->cascadeOnDelete();

            $table->string('taggable_type');
            $table->uuid('taggable_id');

            $table->unsignedInteger('order')->default(0);
            $table->timestamps();

            $table->unique(['workspace_id', 'tag_id', 'taggable_type', 'taggable_id']);
            $table->index(['workspace_id', 'taggable_type', 'taggable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('taggables');
    }
};
