<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Forward: drop is_internal column and platform_role_user table — replaced by
// the admin guard (separate admins table + platform RBAC via spatie admin scope).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_internal');
        });

        Schema::dropIfExists('platform_role_user');
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_internal')->default(false)->after('status');
        });

        Schema::create('platform_role_user', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('user_id');
            $table->string('platform_role');
            $table->timestamps();

            $table->unique(['user_id', 'platform_role']);
        });
    }
};
