<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// otp_secret được mã hoá ở tầng ứng dụng nên chuỗi lưu dài hơn varchar(255) và
// không còn so sánh trực tiếp được — nới sang text và bỏ ràng buộc unique đã mất
// ý nghĩa (Chatwoot giữ được vì dùng mã hoá xác định/deterministic).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique('users_otp_secret_unique');
            $table->text('otp_secret')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('otp_secret')->nullable()->change();
            $table->unique('otp_secret');
        });
    }
};
