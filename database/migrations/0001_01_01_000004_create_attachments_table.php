<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Thay ActiveStorage (quyết định #9): một bảng attachments polymorphic
        // dùng chung — avatar user (A4), attachment message (B9), logo inbox…
        // Giữ các cột nghiệp vụ của bảng attachments Chatwoot (file_type,
        // extension, external_url, coordinates, meta); message_id → morph.
        Schema::create('attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->nullable()->constrained()->cascadeOnDelete();
            $table->morphs('attachable');
            $table->integer('file_type')->default(0);
            $table->string('extension')->nullable();
            $table->string('external_url')->nullable();
            $table->float('coordinates_lat')->default(0);
            $table->float('coordinates_long')->default(0);
            $table->string('fallback_title')->nullable();
            $table->jsonb('meta')->default('{}');
            $table->string('disk')->default('public');
            $table->string('path')->nullable();
            $table->string('filename')->nullable();
            $table->string('content_type')->nullable();
            $table->unsignedBigInteger('byte_size')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attachments');
    }
};
