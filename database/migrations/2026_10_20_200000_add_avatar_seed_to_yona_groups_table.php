<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Avatar nhóm quản trị chọn từ lưới hình khối (seed `pick-{n}`); NULL = hình theo id nhóm.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('yona_groups', function (Blueprint $table) {
            $table->string('avatar_seed', 32)->nullable()->after('avatar_path');
        });
    }

    public function down(): void
    {
        Schema::table('yona_groups', function (Blueprint $table) {
            $table->dropColumn('avatar_seed');
        });
    }
};
