<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Port từ db/schema.rb Chatwoot v4.17.1 (`notification_subscriptions`): cùng bộ
// cột, cùng tên index. Bản gốc không đặt khóa ngoại; ở đây ràng buộc thật theo
// quy ước của repo nên xóa user là dọn luôn đăng ký thông báo đẩy của họ.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->integer('subscription_type');
            $table->jsonb('subscription_attributes')->default('{}');
            $table->text('identifier')->nullable();
            $table->timestamps(6);

            $table->unique('identifier', 'index_notification_subscriptions_on_identifier');
            $table->index('user_id', 'index_notification_subscriptions_on_user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_subscriptions');
    }
};
