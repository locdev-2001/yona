<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Port từ db/schema.rb Chatwoot v4.17.1 (`notification_settings` + `notifications`):
// cùng bộ cột, cùng tên index. Bản gốc không đặt khóa ngoại; ở đây ràng buộc thật
// theo quy ước của repo nên xóa account/user là dọn luôn thông báo.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->integer('email_flags')->default(0);
            $table->integer('push_flags')->default(0);
            $table->timestamps(6);

            $table->unique(['account_id', 'user_id'], 'by_account_user');
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->integer('notification_type');
            $table->string('primary_actor_type');
            $table->unsignedBigInteger('primary_actor_id');
            $table->string('secondary_actor_type')->nullable();
            $table->unsignedBigInteger('secondary_actor_id')->nullable();
            $table->timestamp('read_at', 6)->nullable();
            $table->timestamp('snoozed_until', 6)->nullable();
            $table->timestamp('last_activity_at', 6)->nullable()->useCurrent();
            $table->jsonb('meta')->default('{}');
            $table->timestamps(6);

            $table->index('account_id', 'index_notifications_on_account_id');
            $table->index('last_activity_at', 'index_notifications_on_last_activity_at');
            $table->index(['primary_actor_type', 'primary_actor_id'], 'uniq_primary_actor_per_account_notifications');
            $table->index(['secondary_actor_type', 'secondary_actor_id'], 'uniq_secondary_actor_per_account_notifications');
            $table->index(['user_id', 'account_id', 'snoozed_until', 'read_at'], 'idx_notifications_performance');
            $table->index('user_id', 'index_notifications_on_user_id');
        });

        $this->backfillNotificationSettings();
    }

    // Bản gốc tạo cài đặt trong after_create của account_user; thành viên có sẵn
    // trước khi bảng này ra đời cũng phải có mặc định "báo khi được giao việc"
    // (bit 2 của cả hai cột, xem Notification::TYPES).
    private function backfillNotificationSettings(): void
    {
        $assignmentFlag = 1 << 1;

        DB::table('notification_settings')->insertUsing(
            ['account_id', 'user_id', 'email_flags', 'push_flags', 'created_at', 'updated_at'],
            DB::table('account_users')->select([
                'account_id',
                'user_id',
                DB::raw("$assignmentFlag as email_flags"),
                DB::raw("$assignmentFlag as push_flags"),
                DB::raw('now() as created_at'),
                DB::raw('now() as updated_at'),
            ])
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('notification_settings');
    }
};
