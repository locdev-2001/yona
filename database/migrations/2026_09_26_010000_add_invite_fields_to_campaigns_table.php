<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Lời mời chủ động trên widget: chip trả lời nhanh dưới bong bóng mời, và mời ai
// (mọi khách / khách mới / khách quay lại).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->jsonb('quick_replies')->nullable();
            $table->string('show_to', 16)->default('all');
        });
    }

    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropColumn(['quick_replies', 'show_to']);
        });
    }
};
