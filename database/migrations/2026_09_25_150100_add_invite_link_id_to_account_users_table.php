<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Ghi lại thành viên nào vào account qua link mời nào — phục vụ audit
// ("liên hệ nháp" không áp dụng ở đây nhưng nguyên tắc ghi nguồn thì có).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('account_users', function (Blueprint $table) {
            $table->foreignId('invite_link_id')->nullable()->after('inviter_id')
                ->constrained('account_invite_links')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('account_users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('invite_link_id');
        });
    }
};
