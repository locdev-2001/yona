<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Kênh Yona: người dùng Yona nhắn cho nhau. Mỗi hộp thư cá nhân (account) có đúng một
// kênh này; tin gửi từ hộp thư người này thành tin đến trong hộp thư người kia.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('channel_yona', function (Blueprint $table) {
            $table->id();
            $table->integer('account_id')->unique();
            $table->timestamps(6);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('channel_yona');
    }
};
