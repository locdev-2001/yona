<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// GLOBAL — no workspace_id, no RLS, no BelongsToWorkspace.
// marketplace_items là catalog platform-wide (gói Free/Team/Business, add-on).
// Tenant đọc để hiện gói — GRANT SELECT; billing module write khi seed/admin.
// Pattern: announcements table (2026_06_14_120001).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketplace_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('type')->default('plan'); // plan | addon
            $table->string('billing_type')->default('one_off'); // one_off | recurring (recurring hoãn GĐ2+)
            $table->integer('price_cents')->default(0);
            $table->string('currency', 3)->default('VND');
            // entitlements jsonb: {flags: ["module.inbox", ...], quotas: {"quota.conversations.zalo_personal": 50, ...}}
            $table->jsonb('entitlements')->default('{}');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['type', 'is_active']);
        });

        // GLOBAL: GRANT SELECT cho runtime app role (không RLS).
        // INSERT/UPDATE/DELETE chỉ superuser/admin — không GRANT DML cho crm_app.
        // Dùng default connection (privileged đã được grant bởi owner khi tạo bảng).
        DB::statement('GRANT SELECT ON marketplace_items TO crm_app');
    }

    public function down(): void
    {
        Schema::dropIfExists('marketplace_items');
    }
};
