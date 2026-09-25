<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('super_admin_impersonations', function (Blueprint $table) {
            $table->id();
            // Nullable + nullOnDelete: xoá super admin hoặc user mục tiêu (có thể
            // qua chính console) không được xoá mất dấu vết audit.
            $table->foreignId('super_admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('target_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('reason');
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->string('token_hash', 64)->unique();
            $table->timestamp('used_at')->nullable();
            $table->timestamps();

            $table->index(['super_admin_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('super_admin_impersonations');
    }
};
