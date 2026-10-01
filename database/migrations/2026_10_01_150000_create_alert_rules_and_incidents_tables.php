<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Cảnh báo vận hành cho super admin (/admin/alerts): mỗi chỉ số một luật có ngưỡng,
// mỗi lần vượt ngưỡng một sự cố. Dòng luật mặc định do App\Services\Admin\Alerts\AlertRules
// tự tạo khi thiếu, nên thêm chỉ số mới không cần migration dữ liệu.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alert_rules', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->boolean('enabled')->default(true);
            $table->unsignedInteger('threshold');
            $table->unsignedInteger('window_minutes');
            $table->unsignedInteger('cooldown_minutes');
            $table->bigInteger('last_value')->nullable();
            $table->timestamp('last_evaluated_at')->nullable();
            // Chỉ số dạng "đang là bao nhiêu" phải vượt ngưỡng liên tục đủ cửa sổ mới mở sự cố.
            $table->timestamp('breaching_since')->nullable();
            $table->timestamps();
        });

        Schema::create('alert_incidents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('alert_rule_id')->constrained('alert_rules')->cascadeOnDelete();
            $table->bigInteger('value');
            $table->bigInteger('peak_value');
            $table->bigInteger('last_value');
            $table->unsignedInteger('threshold');
            $table->timestamp('opened_at');
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('notified_at')->nullable();
            $table->timestamp('recovery_notified_at')->nullable();
            $table->timestamps();

            $table->index(['alert_rule_id', 'resolved_at']);
            $table->index('opened_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alert_incidents');
        Schema::dropIfExists('alert_rules');
    }
};
