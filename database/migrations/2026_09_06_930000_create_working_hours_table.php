<?php

use App\Models\Inbox;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Bảng `working_hours` của Chatwoot: một dòng cho mỗi thứ trong tuần của inbox.
        Schema::create('working_hours', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inbox_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('account_id')->nullable()->constrained()->cascadeOnDelete();
            $table->integer('day_of_week');
            $table->boolean('closed_all_day')->default(false);
            $table->integer('open_hour')->nullable();
            $table->integer('open_minutes')->nullable();
            $table->integer('close_hour')->nullable();
            $table->integer('close_minutes')->nullable();
            $table->boolean('open_all_day')->default(false);
            $table->timestamps(6);
        });

        // Bản gốc sinh 7 dòng ở `after_create` của inbox nên mọi inbox luôn có đủ
        // lịch tuần; inbox tạo trước migration này phải được bù cho khớp.
        Inbox::query()->select('id', 'account_id')->orderBy('id')->chunk(100, function ($inboxes) {
            $inboxes->each(fn (Inbox $inbox) => $inbox->createDefaultWorkingHours());
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('working_hours');
    }
};
