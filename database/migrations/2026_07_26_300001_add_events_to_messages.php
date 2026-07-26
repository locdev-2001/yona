<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Nội dung tin là một DANH SÁCH SỰ KIỆN, không phải một chuỗi.
 *
 * Chữ, ảnh, thẻ, nút, ô nhập đều là sự kiện đi ra. Cột này lưu nguyên danh sách
 * đó để một client dựng lại được đúng thứ đã gửi.
 *
 * `body` GIỮ NGUYÊN vai trò: bản chữ phẳng rút từ danh sách sự kiện, dùng cho
 * dòng xem trước ở danh sách hội thoại và cho tìm kiếm toàn văn. Danh sách hội
 * thoại KHÔNG đọc cột mới này — không đụng chỉ mục tìm kiếm nào.
 *
 * Tin cũ có `events = NULL` thì đọc ra đúng một sự kiện chữ dựng từ `body`.
 * Không backfill: một cột NULL đọc được là rẻ hơn một lần viết lại hàng tỉ dòng.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->jsonb('events')->nullable()->after('body');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn('events');
        });
    }
};
