<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Kênh Messenger cá nhân: mỗi hộp thư giữ đúng một tài khoản Facebook, nên khoá slot
// của sidecar chính là `channel_messenger_personal.id`. Mật khẩu, cookie và khoá thiết
// bị chỉ nằm ở sidecar, không bao giờ vào bảng này.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('channel_messenger_personal', function (Blueprint $table) {
            $table->id();
            $table->integer('account_id')->index();

            $table->string('facebook_user_id', 32)->nullable();
            $table->string('display_name')->nullable();

            // login_pending | connected | session_lost | disconnected
            $table->string('state', 32)->default('login_pending');
            $table->uuid('login_token')->nullable()->unique();
            $table->string('session_lost_reason', 512)->nullable();

            $table->timestamp('last_connected_at')->nullable();
            $table->timestamp('last_session_lost_at')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();

            $table->unique(['account_id', 'facebook_user_id']);
            $table->index(['account_id', 'state']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('channel_messenger_personal');
    }
};
