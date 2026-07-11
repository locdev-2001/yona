<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P01b — người phụ trách hội thoại (P07: filter "Của tôi", chia ca trực).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->foreignId('assigned_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->index(['workspace_id', 'assigned_user_id'], 'conversations_ws_assigned_idx');
        });
    }

    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropIndex('conversations_ws_assigned_idx');
            $table->dropConstrainedForeignId('assigned_user_id');
        });
    }
};
