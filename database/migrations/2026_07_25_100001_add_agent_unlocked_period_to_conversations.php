<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * LỊCH SỬ — cột này bị gỡ ngay sau đó bởi migration 100002.
 *
 * Được thêm để tách "đã đếm tiền" khỏi "đã mở khóa gate" khi hạn mức hội thoại
 * còn được thực thi. Founder chốt 25/07/2026 bỏ hẳn gate hạn mức trong giai
 * đoạn tạo thói quen dùng, nên cột mất lý do tồn tại.
 *
 * Giữ file để lịch sử migration khớp với các DB đã chạy nó; forward-only theo
 * quy ước dự án (không rollback).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->string('agent_unlocked_period')->nullable()->after('last_metered_period');
        });

        // conversations bật FORCE ROW LEVEL SECURITY. Connection runtime (yona_app)
        // không BYPASSRLS và migration không bind app.current_workspace → UPDATE
        // trần sẽ thấy 0 dòng và "thành công" im lặng. Ghim connection owner.
        $privileged = DB::connection('pgsql_privileged');

        $expected = (int) $privileged
            ->selectOne('SELECT count(*) AS c FROM conversations WHERE last_metered_period IS NOT NULL')
            ->c;

        $affected = $privileged->update(
            'UPDATE conversations SET agent_unlocked_period = last_metered_period
             WHERE last_metered_period IS NOT NULL'
        );

        if ($affected !== $expected) {
            throw new RuntimeException(
                "Backfill agent_unlocked_period sai: cập nhật {$affected} dòng, kỳ vọng {$expected}. ".
                'Nhiều khả năng migration chạy bằng role không BYPASSRLS.'
            );
        }
    }

    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropColumn('agent_unlocked_period');
        });
    }
};
