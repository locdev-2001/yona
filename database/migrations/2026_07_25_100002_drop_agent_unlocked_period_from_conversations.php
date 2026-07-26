<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Gỡ gate hạn mức hội thoại (quyết định founder 25/07/2026).
 *
 * Sản phẩm ưu tiên để tính năng lõi chạy ổn định và tạo thói quen dùng trước;
 * áp hạn mức ngay từ đầu gây phản ứng ngược. Gói thu phí mở sau.
 *
 * Bộ đếm KHÔNG bị gỡ: `channel_usage.answered_count` vẫn tăng mỗi khi tenant
 * trả lời một hội thoại trong kỳ, để lúc mở gói đã có sẵn dữ liệu lịch sử.
 * Cột này chỉ phục vụ việc CHẶN nên mất lý do tồn tại.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropColumn('agent_unlocked_period');
        });
    }

    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->string('agent_unlocked_period')->nullable()->after('last_metered_period');
        });
    }
};
