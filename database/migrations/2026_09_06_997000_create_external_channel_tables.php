<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Các bảng kênh ngoài: Facebook Messenger,
// Instagram, Telegram, LINE, SMS (Bandwidth), Twilio SMS/WhatsApp, WhatsApp Cloud,
// TikTok, Twitter. Cột mang bí mật để `text` vì cast `encrypted` sinh chuỗi dài hơn.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('channel_facebook_pages', function (Blueprint $table) {
            $table->id();
            $table->string('page_id');
            $table->text('user_access_token');
            $table->text('page_access_token');
            $table->integer('account_id');
            $table->string('instagram_id')->nullable();
            $table->timestamps();

            $table->unique(['page_id', 'account_id']);
            $table->index('page_id');
        });

        Schema::create('channel_instagram', function (Blueprint $table) {
            $table->id();
            $table->text('access_token');
            $table->timestamp('expires_at');
            $table->integer('account_id');
            $table->string('instagram_id');
            $table->timestamps();

            $table->unique('instagram_id');
        });

        Schema::create('channel_telegram', function (Blueprint $table) {
            $table->id();
            $table->string('bot_name')->nullable();
            $table->integer('account_id');
            $table->text('bot_token');
            $table->timestamps();
        });
        // bot_token là cột mã hóa deterministic ở bản gốc nên index unique vẫn dùng được;
        // ở đây giữ nguyên bản rõ (xem "Khác biệt cố ý" trong note) để tra cứu theo URL webhook.
        Schema::table('channel_telegram', fn (Blueprint $table) => $table->unique('bot_token'));

        Schema::create('channel_line', function (Blueprint $table) {
            $table->id();
            $table->integer('account_id');
            $table->string('line_channel_id');
            $table->text('line_channel_secret');
            $table->text('line_channel_token');
            $table->timestamps();

            $table->unique('line_channel_id');
        });

        Schema::create('channel_sms', function (Blueprint $table) {
            $table->id();
            $table->integer('account_id');
            $table->string('phone_number');
            $table->string('provider')->default('default');
            $table->jsonb('provider_config')->default('{}');
            $table->timestamps();

            $table->unique('phone_number');
        });

        Schema::create('channel_twilio_sms', function (Blueprint $table) {
            $table->id();
            $table->string('phone_number')->nullable();
            $table->text('auth_token');
            $table->string('account_sid');
            $table->integer('account_id');
            $table->integer('medium')->default(0);
            $table->string('messaging_service_sid')->nullable();
            $table->string('api_key_sid')->nullable();
            $table->string('api_key_secret')->nullable();
            $table->jsonb('content_templates')->default('{}');
            $table->timestamp('content_templates_last_updated')->nullable();
            $table->boolean('voice_enabled')->default(false);
            $table->string('twiml_app_sid')->nullable();
            $table->jsonb('provider_config')->default('{}');
            $table->timestamps();

            $table->unique(['account_sid', 'phone_number']);
            $table->unique('messaging_service_sid');
            $table->unique('phone_number');
        });

        Schema::create('channel_whatsapp', function (Blueprint $table) {
            $table->id();
            $table->integer('account_id');
            $table->text('business_management_token')->nullable();
            $table->string('phone_number');
            $table->string('provider')->default('default');
            $table->jsonb('provider_config')->default('{}');
            $table->jsonb('message_templates')->default('{}');
            $table->timestamp('message_templates_last_updated')->nullable();
            $table->jsonb('phone_number_health')->default('{}');
            $table->timestamp('phone_number_health_checked_at')->nullable();
            $table->string('phone_number_health_error', 500)->nullable();
            $table->timestamps();

            $table->unique('phone_number');
            $table->index('phone_number_health_checked_at');
        });

        Schema::create('channel_tiktok', function (Blueprint $table) {
            $table->id();
            $table->integer('account_id');
            $table->string('business_id');
            $table->text('access_token');
            $table->timestamp('expires_at');
            $table->text('refresh_token');
            $table->timestamp('refresh_token_expires_at');
            $table->timestamps();

            $table->unique('business_id');
        });

        Schema::create('channel_twitter_profiles', function (Blueprint $table) {
            $table->id();
            $table->string('profile_id');
            $table->text('twitter_access_token');
            $table->text('twitter_access_token_secret');
            $table->integer('account_id');
            $table->boolean('tweets_enabled')->default(true);
            $table->timestamps();

            $table->unique(['account_id', 'profile_id']);
        });
    }

    public function down(): void
    {
        foreach ([
            'channel_twitter_profiles', 'channel_tiktok', 'channel_whatsapp', 'channel_twilio_sms',
            'channel_sms', 'channel_line', 'channel_telegram', 'channel_instagram', 'channel_facebook_pages',
        ] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
