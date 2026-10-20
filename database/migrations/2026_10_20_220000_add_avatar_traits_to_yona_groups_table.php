<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('yona_groups', function (Blueprint $table) {
            $table->jsonb('avatar_traits')->nullable()->after('avatar_seed');
        });
    }

    public function down(): void
    {
        Schema::table('yona_groups', function (Blueprint $table) {
            $table->dropColumn('avatar_traits');
        });
    }
};
