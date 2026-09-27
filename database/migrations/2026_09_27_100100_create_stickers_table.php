<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Chủ sở hữu nằm ở bộ (sticker_packs.account_id), không chép xuống đây để khỏi lệch.
// Đường dẫn tệp tương đối trên disk `stickers`; URL dựng lúc đọc. Ba đường dẫn
// để trống tới khi sticker xử lý xong.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stickers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sticker_pack_id')->constrained()->cascadeOnDelete();
            $table->string('label')->nullable();
            $table->jsonb('keywords')->default('[]');
            $table->string('animation_path')->nullable();
            $table->string('poster_path')->nullable();
            $table->string('static_path')->nullable();
            $table->string('content_hash', 64);
            $table->unsignedInteger('width');
            $table->unsignedInteger('height');
            $table->unsignedInteger('frame_count');
            $table->unsignedInteger('duration_ms');
            $table->unsignedInteger('byte_size');
            $table->string('status', 20)->default('processing');
            $table->string('failure_code')->nullable();
            $table->integer('position')->default(0);
            $table->timestamps(6);

            $table->unique(['sticker_pack_id', 'content_hash']);
            $table->index(['sticker_pack_id', 'status', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stickers');
    }
};
