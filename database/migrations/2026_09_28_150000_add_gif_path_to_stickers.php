<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Bản GIF gửi kênh ngoài coi PNG là ảnh chụp (phóng to): GIF đi như ảnh động giữ
// đúng cỡ. Sticker dựng trước khi có cột này để trống tới khi `stickers:rerender`.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stickers', function (Blueprint $table) {
            $table->string('gif_path')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('stickers', function (Blueprint $table) {
            $table->dropColumn('gif_path');
        });
    }
};
