<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('channel_web_widgets', function (Blueprint $table) {
            $table->id();
            $table->string('website_url')->nullable();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->string('website_token')->nullable()->unique();
            $table->string('widget_color')->default('#1f93ff');
            $table->string('welcome_title')->nullable();
            $table->string('welcome_tagline')->nullable();
            $table->integer('feature_flags')->default(7);
            $table->integer('reply_time')->default(0);
            $table->string('hmac_token')->nullable()->unique();
            $table->boolean('pre_chat_form_enabled')->default(false);
            $table->jsonb('pre_chat_form_options')->default('{}');
            $table->boolean('hmac_mandatory')->default(false);
            $table->boolean('continuity_via_email')->default(true);
            $table->text('allowed_domains')->default('');
            $table->timestamps(6);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('channel_web_widgets');
    }
};
