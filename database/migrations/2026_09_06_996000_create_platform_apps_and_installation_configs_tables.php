<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Port từ refs/chatwoot/db/schema.rb — platform_apps, platform_app_permissibles
// (Platform API) và installation_configs (cấu hình toàn cài đặt, Super Admin).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_apps', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->timestamps(6);
        });

        Schema::create('platform_app_permissibles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('platform_app_id')->constrained()->cascadeOnDelete();
            $table->string('permissible_type');
            $table->unsignedBigInteger('permissible_id');
            $table->timestamps(6);

            $table->index(['permissible_type', 'permissible_id'], 'index_platform_app_permissibles_on_permissibles');
            $table->unique(['platform_app_id', 'permissible_id', 'permissible_type'], 'unique_permissibles_index');
        });

        Schema::create('installation_configs', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->jsonb('serialized_value')->default('{}');
            $table->boolean('locked')->default(true);
            $table->timestamps(6);

            $table->unique('name');
            $table->unique(['name', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('installation_configs');
        Schema::dropIfExists('platform_app_permissibles');
        Schema::dropIfExists('platform_apps');
    }
};
