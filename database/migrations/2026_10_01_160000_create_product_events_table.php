<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Sự kiện sản phẩm: account nào đã làm gì, lúc nào (onboarding, kết nối kênh, dùng
// tính năng). Chỉ lưu id, số đếm, nền tảng và thời điểm; KHÔNG lưu nội dung tin
// hay dữ liệu cá nhân của khách cuối (Nghị định 13). Ghi duy nhất qua
// App\Services\ProductEvents\ProductEventRecorder.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained('accounts')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name', 64);
            $table->jsonb('properties')->default('{}');
            // Sự kiện gắn với một bản ghi (hộp thư, nhãn, tin…) hay chỉ xảy ra một lần
            // (tin đầu tiên) mang khoá này: ghi trực tiếp và dựng lại từ dữ liệu cũ
            // cùng khoá nên chạy lại không bao giờ nhân đôi.
            $table->string('dedupe_key', 191)->nullable();
            $table->timestamp('occurred_at', 6);
            $table->timestamp('created_at', 6)->useCurrent();

            $table->index(['name', 'occurred_at']);
            $table->index(['account_id', 'occurred_at']);
        });

        DB::statement('create unique index product_events_dedupe_key_unique on product_events (dedupe_key) where dedupe_key is not null');
    }

    public function down(): void
    {
        Schema::dropIfExists('product_events');
    }
};
