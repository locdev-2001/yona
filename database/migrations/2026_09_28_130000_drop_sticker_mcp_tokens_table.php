<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Kho sticker không còn mở cho AI bằng token: token đang cấp mất hiệu lực cùng bảng.
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('sticker_mcp_tokens');
    }

    public function down(): void
    {
        Schema::create('sticker_mcp_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('scope', 16);
            $table->string('token_hash', 64)->unique();
            $table->timestamp('last_used_at', 6)->nullable();
            $table->timestamps(6);

            $table->index('account_id');
        });
    }
};
