<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('channel_api', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->string('webhook_url')->nullable();
            $table->string('identifier')->nullable()->unique();
            $table->string('hmac_token')->nullable()->unique();
            $table->boolean('hmac_mandatory')->default(false);
            $table->jsonb('additional_attributes')->default('{}');
            $table->string('secret')->nullable();
            $table->timestamps();
        });

        Schema::create('inboxes', function (Blueprint $table) {
            $table->id();
            $table->integer('channel_id');
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('channel_type')->nullable();
            $table->boolean('enable_auto_assignment')->default(true);
            $table->boolean('greeting_enabled')->default(false);
            $table->string('greeting_message')->nullable();
            $table->string('email_address')->nullable();
            $table->boolean('working_hours_enabled')->default(false);
            $table->string('out_of_office_message')->nullable();
            $table->string('timezone')->default('UTC');
            $table->boolean('enable_email_collect')->default(true);
            $table->boolean('csat_survey_enabled')->default(false);
            $table->boolean('allow_messages_after_resolved')->default(true);
            $table->jsonb('auto_assignment_config')->default('{}');
            $table->boolean('lock_to_single_conversation')->default(false);
            // portals chưa port (nhóm D) — cột giữ chỗ, FK thêm khi có bảng.
            $table->unsignedBigInteger('portal_id')->nullable();
            $table->integer('sender_name_type')->default(0);
            $table->string('business_name')->nullable();
            $table->jsonb('csat_config')->default('{}');
            $table->timestamps();

            $table->index('account_id');
            $table->index(['channel_id', 'channel_type']);
            $table->index('portal_id');
        });

        Schema::create('inbox_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('inbox_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->index('inbox_id');
            $table->unique(['inbox_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inbox_members');
        Schema::dropIfExists('inboxes');
        Schema::dropIfExists('channel_api');
    }
};
