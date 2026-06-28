<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// attachments: polymorphic file attachments for any workspace entity (P03).
// contact_id is intentionally unconstrained — contacts table arrives at P06.
// attachment_key (Str::random(40)) enables safe download without exposing uuid.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attachments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();

            // Polymorphic morphs — alias set defined in MorphMapServiceProvider.
            $table->string('attachable_type');
            $table->uuid('attachable_id');

            // Uploader attribution: staff user OR portal contact (nullable, mutually exclusive).
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->uuid('contact_id')->nullable(); // unconstrained until contacts table (P06)

            $table->string('original_name');
            $table->string('path')->nullable();          // disk path (private storage)
            $table->string('external_link')->nullable(); // cloud URL (no bytes stored)
            $table->string('thumbnail_path')->nullable();
            $table->string('mime')->nullable();
            $table->unsignedBigInteger('size')->nullable(); // bytes

            $table->boolean('visible_to_customer')->default(false); // portal M2 gate
            $table->string('attachment_key');                       // safe download token

            $table->integer('lock_version')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['workspace_id', 'attachment_key']);
            $table->index(['workspace_id', 'attachable_type', 'attachable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attachments');
    }
};
