<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dashboard_apps', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->jsonb('content')->default('[]');
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps(6);

            $table->index('account_id');
            $table->index('user_id');
        });

        Schema::create('integrations_hooks', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('status')->default(1);
            $table->foreignId('inbox_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('account_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('app_id')->nullable();
            $table->unsignedSmallInteger('hook_type')->default(0);
            $table->string('reference_id')->nullable();
            $table->string('access_token')->nullable();
            $table->jsonb('settings')->default('{}');
            $table->timestamps(6);

            $table->index('account_id');
            $table->index('inbox_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('integrations_hooks');
        Schema::dropIfExists('dashboard_apps');
    }
};
