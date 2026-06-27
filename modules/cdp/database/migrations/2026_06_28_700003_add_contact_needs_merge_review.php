<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase-07 (cdp-dedup) — cột needs_merge_review trên contacts.
 *
 * Khi IdentityResolver phát hiện 2 contact cùng SĐT → flag review thay vì auto-merge.
 * Admin/tenant xác nhận rồi mới merge (mergeContacts chỉ chạy sau xác nhận).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            $table->boolean('needs_merge_review')->default(false)->after('is_primary');
            $table->uuid('merge_review_with')->nullable()->after('needs_merge_review');
        });
    }

    public function down(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            $table->dropColumn(['needs_merge_review', 'merge_review_with']);
        });
    }
};
