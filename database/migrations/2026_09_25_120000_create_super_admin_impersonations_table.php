<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Nhật ký "đăng nhập hộ" (impersonate) từ console quản trị: ai bấm, hộ ai,
// vào tài khoản nào, lý do gì — token_hash nối bản ghi này với token SSO một
// lần dùng thật sự tiêu thụ ở Auth\SessionsController.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('super_admin_impersonations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('super_admin_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('target_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->text('reason');
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->string('token_hash', 64)->unique();
            $table->timestamp('used_at')->nullable();
            $table->timestamps();

            $table->index(['super_admin_id', 'created_at']);
            $table->index(['account_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('super_admin_impersonations');
    }
};
