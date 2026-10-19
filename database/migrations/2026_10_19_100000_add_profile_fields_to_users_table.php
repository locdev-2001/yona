<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Hồ sơ người dùng cá nhân: tìm nhau bằng username (luôn lưu chữ thường).
// phone + phone_verified_at để sẵn cho xác thực số điện thoại khi luật bắt buộc.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username', 30)->nullable()->unique();
            $table->string('bio', 160)->nullable();
            $table->string('phone', 20)->nullable()->unique();
            $table->timestamp('phone_verified_at', 6)->nullable();
            $table->timestamp('last_seen_at', 6)->nullable();
            $table->jsonb('privacy')->default('{}');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['username']);
            $table->dropUnique(['phone']);
            $table->dropColumn(['username', 'bio', 'phone', 'phone_verified_at', 'last_seen_at', 'privacy']);
        });
    }
};
