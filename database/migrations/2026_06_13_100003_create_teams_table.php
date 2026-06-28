<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Teams form a per-workspace tree (BR-X02). parent_id is self-referential;
// cycle integrity is guarded in TeamService + the team_closure table.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teams', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->string('name');
            $table->uuid('parent_id')->nullable();
            $table->integer('lock_version')->default(0); // BR-X08 optimistic concurrency
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['workspace_id', 'name']);
            $table->index(['workspace_id', 'parent_id']);
        });

        // Self-referencing FK added after the table (and its PK) exists.
        Schema::table('teams', function (Blueprint $table) {
            $table->foreign('parent_id')->references('id')->on('teams')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teams');
    }
};
