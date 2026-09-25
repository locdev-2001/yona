<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Trang công khai theo token (`/m/{token}`, phase-05 §C): không dùng lại uuid hội
// thoại của CSAT vì uuid đó không hết hạn và dùng chung cho mọi trang. DB chỉ lưu
// hash — token thật (32 byte base62) chỉ tồn tại trên URL đã phát cho khách.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('message_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_id')->constrained()->cascadeOnDelete();
            $table->string('purpose', 20);
            // Mã thẻ trong 'cards' khi trang là chi tiết một sản phẩm cụ thể của thẻ đó.
            $table->string('item_id', 64)->nullable();
            $table->string('token_hash', 64)->unique();
            $table->timestamp('expires_at', 6);
            $table->timestamp('consumed_at', 6)->nullable();
            $table->timestamps(6);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('message_access_tokens');
    }
};
