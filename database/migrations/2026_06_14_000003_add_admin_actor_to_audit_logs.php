<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Additive columns for dual-actor audit (phase 04).
// actor_admin_id: set when the action is performed by an Admin (actor_type='admin').
// impersonated_by_admin_id: set when an Admin is impersonating a User during the action.
// No FK constraint — code-enforced per project DB_LOOSE convention.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->unsignedBigInteger('actor_admin_id')->nullable()->after('actor_type')->index();
            $table->unsignedBigInteger('impersonated_by_admin_id')->nullable()->after('impersonated_by')->index();
        });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropColumn(['actor_admin_id', 'impersonated_by_admin_id']);
        });
    }
};
