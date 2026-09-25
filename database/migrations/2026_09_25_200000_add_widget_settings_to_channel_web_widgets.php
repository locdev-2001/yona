<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Cấu hình widget mới (launcher, khối Home, kênh khác, link, thu thông tin…).
// Null = dùng mặc định trong App\Support\Widget\WidgetSettings.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('channel_web_widgets', function (Blueprint $table) {
            $table->jsonb('widget_settings')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('channel_web_widgets', function (Blueprint $table) {
            $table->dropColumn('widget_settings');
        });
    }
};
