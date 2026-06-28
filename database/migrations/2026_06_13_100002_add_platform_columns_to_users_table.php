<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Additive: users stays a bigint global identity (NOT workspace-scoped). Adds
// global account state + platform-staff flag + per-user locale/timezone.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('status')->default('active')->after('password'); // active|locked
            $table->boolean('is_internal')->default(false)->after('status'); // platform staff
            $table->string('locale', 5)->nullable()->after('is_internal');
            $table->string('timezone')->nullable()->after('locale');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['status', 'is_internal', 'locale', 'timezone']);
        });
    }
};
