<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('client_id');
            $table->string('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->string('browser_name')->nullable();
            $table->string('browser_version')->nullable();
            $table->string('device_name')->nullable();
            $table->string('platform_name')->nullable();
            $table->string('platform_version')->nullable();
            $table->string('city')->nullable();
            $table->string('country')->nullable();
            $table->string('country_code')->nullable();
            $table->timestamp('last_activity_at', 6)->nullable();
            $table->timestamps(6);

            $table->unique(['user_id', 'client_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_sessions');
    }
};
