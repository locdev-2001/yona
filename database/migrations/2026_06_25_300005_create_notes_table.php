<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// notes: internal staff notes for any workspace entity (P03).
// date_contacted mirrors Perfex; P07 reads it to update lead.last_contact.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();

            $table->string('noteable_type');
            $table->uuid('noteable_id');

            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();

            $table->text('body');
            $table->date('date_contacted')->nullable(); // Perfex field; P07 consumes for lead.last_contact

            $table->integer('lock_version')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['workspace_id', 'noteable_type', 'noteable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notes');
    }
};
