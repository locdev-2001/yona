<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Quản trị chép lại link mời đang dùng bất cứ lúc nào: lưu token mã hoá bằng khoá app để dựng
// lại link; tra link vẫn đi qua `token_digest`. Link tạo trước đó không có token (NULL).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('yona_group_invite_links', function (Blueprint $table) {
            $table->text('token')->nullable()->after('token_digest');
        });
    }

    public function down(): void
    {
        Schema::table('yona_group_invite_links', function (Blueprint $table) {
            $table->dropColumn('token');
        });
    }
};
