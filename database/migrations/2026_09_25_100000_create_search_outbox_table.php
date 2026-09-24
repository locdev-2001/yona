<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Hàng chờ thay đổi cần đẩy sang chỉ mục tìm kiếm ngoài PostgreSQL. Không khoá
// ngoại: dòng xoá phải sống sót sau khi bản ghi gốc (kể cả account) đã mất.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('search_outbox', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('account_id');
            $table->string('document_type', 32);
            $table->unsignedBigInteger('document_id');
            $table->string('operation', 8);
            $table->timestamp('created_at', 6)->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('search_outbox');
    }
};
