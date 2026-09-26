<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Câu trả lời mẫu mang được một thẻ (Gửi thẻ) thay vì chỉ chữ thuần:
// `content_type` cùng tên loại với Message::CONTENT_TYPES (chuỗi, không phải
// số) vì StructuredTypeRegistry đọc theo chuỗi; `content_attributes` cùng
// khuôn dữ liệu type đó chuẩn hoá, riêng bank_transfer chỉ lưu
// payment_account_id/amount/memo (xem CannedResponsesController).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('canned_responses', function (Blueprint $table) {
            $table->string('content_type')->nullable()->after('content');
            $table->jsonb('content_attributes')->nullable()->after('content_type');
        });
    }

    public function down(): void
    {
        Schema::table('canned_responses', function (Blueprint $table) {
            $table->dropColumn(['content_type', 'content_attributes']);
        });
    }
};
