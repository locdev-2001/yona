<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Platform plane (crm-authorization-model.md): internal staff roles. Empty for
// customer users. super_admin | support_engineer | billing_ops. Server-controlled.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_role_user', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('platform_role'); // super_admin|support_engineer|billing_ops
            $table->timestamps();

            $table->unique(['user_id', 'platform_role']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_role_user');
    }
};
