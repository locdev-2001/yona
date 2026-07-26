<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Nối CRM vào tầng định danh — CHỈ THÊM một cột, không bỏ trường nào.
 *
 * Dời `contacts.first_name/phone` và `leads.name/phone` sang `profiles` là kế
 * hoạch riêng, cố ý không làm ở đây. Lý do không phải "để sau cho nhanh":
 * `lead.name` là ẢNH CHỤP lúc thu thập, không phải danh tính sống — đọc thẳng từ
 * hồ sơ thì khách đổi tên Zalo thành "🔥SALE🔥" là mọi lead lịch sử đổi theo.
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (['contacts', 'leads'] as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->uuid('profile_id')->nullable();
                $blueprint->index(['workspace_id', 'profile_id']);
            });
        }
    }

    public function down(): void
    {
        foreach (['contacts', 'leads'] as $table) {
            Schema::table($table, function (Blueprint $blueprint) use ($table) {
                $blueprint->dropIndex($table.'_workspace_id_profile_id_index');
                $blueprint->dropColumn('profile_id');
            });
        }
    }
};
