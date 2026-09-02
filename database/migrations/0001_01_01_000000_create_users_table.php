<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('provider')->default('email');
            $table->string('uid')->default('');
            $table->string('password')->default('');
            $table->unsignedInteger('sign_in_count')->default(0);
            $table->timestamp('current_sign_in_at', 6)->nullable();
            $table->timestamp('last_sign_in_at', 6)->nullable();
            $table->string('current_sign_in_ip')->nullable();
            $table->string('last_sign_in_ip')->nullable();
            $table->string('confirmation_token')->nullable();
            $table->timestamp('confirmed_at', 6)->nullable();
            $table->timestamp('confirmation_sent_at', 6)->nullable();
            $table->string('unconfirmed_email')->nullable();
            $table->string('name');
            $table->string('display_name')->nullable();
            $table->string('email')->nullable();
            $table->string('pubsub_token')->nullable();
            $table->integer('availability')->default(0);
            $table->jsonb('ui_settings')->default('{}');
            $table->jsonb('custom_attributes')->default('{}');
            $table->string('type')->nullable();
            $table->text('message_signature')->nullable();
            $table->string('otp_secret')->nullable();
            $table->integer('consumed_timestep')->nullable();
            $table->boolean('otp_required_for_login')->default(false);
            $table->text('otp_backup_codes')->nullable();
            $table->rememberToken();
            $table->timestamps(6);

            $table->unique('email');
            $table->unique('pubsub_token');
            $table->unique('otp_secret');
            $table->unique(['uid', 'provider']);
            $table->index('otp_required_for_login');
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at', 6)->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
