<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Port bảng `channel_email` của db/schema.rb (Chatwoot v4.17.1).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('channel_email', function (Blueprint $table) {
            $table->id();
            $table->integer('account_id');
            $table->string('email');
            $table->string('forward_to_email');
            $table->timestamps();

            $table->boolean('imap_enabled')->default(false);
            $table->string('imap_address')->default('');
            $table->integer('imap_port')->default(0);
            $table->string('imap_login')->default('');
            // Khác bản gốc (default ''): cột mã hóa không mang được chuỗi rỗng.
            $table->text('imap_password')->nullable();
            $table->boolean('imap_enable_ssl')->default(true);
            $table->string('imap_authentication')->default('plain');

            $table->boolean('smtp_enabled')->default(false);
            $table->string('smtp_address')->default('');
            $table->integer('smtp_port')->default(0);
            $table->string('smtp_login')->default('');
            $table->text('smtp_password')->nullable();
            $table->string('smtp_domain')->default('');
            $table->boolean('smtp_enable_starttls_auto')->default(true);
            $table->string('smtp_authentication')->default('login');
            $table->string('smtp_openssl_verify_mode')->default('none');
            $table->boolean('smtp_enable_ssl_tls')->default(false);

            $table->jsonb('provider_config')->default('{}');
            $table->string('provider')->nullable();
            $table->boolean('verified_for_sending')->default(false);

            $table->unique('email');
            $table->unique('forward_to_email');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('channel_email');
    }
};
