<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Thành viên của hội thoại giữa người dùng. Trạng thái riêng của từng người
// (vai trò, tin chờ, đã đọc, tắt thông báo, lưu trữ, ghim) nằm ở đây.
// last_read_message_id không có khoá ngoại vì messages khoá theo (id, created_at).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversation_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->smallInteger('role')->default(1);
            $table->smallInteger('status')->default(1);
            $table->unsignedBigInteger('last_read_message_id')->nullable();
            $table->timestamp('muted_until', 6)->nullable();
            $table->timestamp('archived_at', 6)->nullable();
            $table->timestamp('pinned_at', 6)->nullable();
            $table->timestamp('joined_at', 6)->useCurrent();
            $table->foreignId('invited_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps(6);

            $table->unique(['conversation_id', 'user_id']);
            $table->index(['user_id', 'status', 'conversation_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversation_members');
    }
};
