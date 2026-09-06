<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Kênh Zalo cá nhân (G1) — không có bảng tương ứng trong db/schema.rb của Chatwoot;
// khuôn cột bám bảng `zalo_connections` của nhánh `main` nhưng gọn lại vì ở đây
// mỗi inbox chỉ giữ ĐÚNG MỘT tài khoản Zalo, nên khóa slot của bridge chính là
// `channel_zalo.id` (không cần sequence connection_id riêng).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('channel_zalo', function (Blueprint $table) {
            $table->id();
            $table->integer('account_id');

            // Danh tính tài khoản Zalo — chỉ có sau khi quét QR thành công.
            $table->string('zalo_uid', 64)->nullable();
            $table->string('display_name')->nullable();
            $table->string('phone', 32)->nullable();

            // qr_waiting | connected | session_lost
            $table->string('state', 32)->default('qr_waiting');
            $table->string('qr_token', 64)->nullable();
            $table->string('session_lost_reason', 512)->nullable();

            $table->timestamp('last_connected_at')->nullable();
            $table->timestamp('last_session_lost_at')->nullable();
            $table->timestamp('last_qr_at')->nullable();
            $table->timestamps();

            $table->unique('qr_token');
            $table->unique(['account_id', 'zalo_uid']);
            $table->index(['account_id', 'state']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('channel_zalo');
    }
};
