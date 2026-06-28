<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tier 0 gap window — thêm cột last_session_lost_at vào zalo_connections.
 *
 * FE so sánh [last_session_lost_at, last_connected_at] để tính gap và hiển thị banner.
 * Additive: KHÔNG xóa/đổi cột cũ. KHÔNG fresh/refresh/wipe.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('zalo_connections', function (Blueprint $table) {
            $table->timestamp('last_session_lost_at')->nullable()->after('last_connected_at');
        });
    }

    public function down(): void
    {
        Schema::table('zalo_connections', function (Blueprint $table) {
            $table->dropColumn('last_session_lost_at');
        });
    }
};
