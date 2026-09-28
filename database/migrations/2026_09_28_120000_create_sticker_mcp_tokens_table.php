<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Token cho AI gọi MCP/REST kho sticker. Chỉ lưu sha256 của token; scope quyết
// định kho được chạm: kho riêng của account hay kho nền tảng (account_id NULL
// của sticker_packs). Quyền của người tạo được kiểm lại mỗi lần dùng.
return new class extends Migration
{
    public function up(): void
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

    public function down(): void
    {
        Schema::dropIfExists('sticker_mcp_tokens');
    }
};
