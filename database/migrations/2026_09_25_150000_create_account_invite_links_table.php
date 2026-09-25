<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Link mời tự phục vụ do quản trị viên tạo, gửi tay qua Zalo (khác lời mời qua
// email của AgentBuilder). Token thật không lưu — chỉ lưu digest sha256.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('account_invite_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedTinyInteger('role')->default(0);
            $table->string('token_digest', 64)->unique();
            $table->timestamp('expires_at');
            $table->unsignedInteger('max_uses')->nullable();
            $table->unsignedInteger('use_count')->default(0);
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->index(['account_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_invite_links');
    }
};
