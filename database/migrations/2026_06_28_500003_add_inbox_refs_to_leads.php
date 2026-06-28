<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P07 — Thêm inbox refs vào leads.
 *
 * conversation_id: UUID nullable, no FK (cross-module N1 — inbox không phụ thuộc crm-sales model).
 * contact_id: UUID nullable, no FK (cross-module N1 — CDP profile ref, không ràng buộc cứng).
 *
 * Soft-delete được dùng ở cả Conversation và Lead nên ref "treo" sẽ
 * không xảy ra trong thực tế (soft-delete bảo toàn row, không xóa cứng).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            // cross-module refs — no FK (N1 isolation)
            $table->uuid('conversation_id')->nullable()->after('converted_client_id');
            $table->uuid('contact_id')->nullable()->after('conversation_id');

            $table->index('conversation_id');
            $table->index('contact_id');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropIndex(['conversation_id']);
            $table->dropIndex(['contact_id']);
            $table->dropColumn(['conversation_id', 'contact_id']);
        });
    }
};
