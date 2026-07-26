<?php

namespace App\Services;

use App\Models\Conversation;
use Illuminate\Support\Facades\DB;

/**
 * MeteringService — THỐNG KÊ hội thoại per-channel per-month.
 *
 * Chỉ đo, KHÔNG chặn (quyết định founder 25/07/2026): cho dùng không giới hạn
 * trong giai đoạn tạo thói quen dùng, số liệu tích lũy để xây chính sách gói
 * cước sau. Áp hạn mức ngay từ đầu gây phản ứng ngược.
 *
 * Vì vậy service này không có method nào ném exception hay trả false. Muốn
 * dựng lại gate sau này thì thêm một lớp policy riêng đọc số liệu ở đây —
 * đừng nhét điều kiện chặn ngược vào bộ đếm.
 *
 * F1 race-safe: meterReply dùng 1 UPDATE compare-set + ON CONFLICT DO UPDATE,
 * nên 1 hội thoại/kênh/kỳ chỉ tăng answered_count đúng một lần.
 * F14: chỉ đếm khi tenant TRẢ LỜI; tin inbound không bao giờ đi qua đây.
 *
 * Isolation: KHÔNG import Models của channel-zalo (N1).
 */
class MeteringService
{
    /**
     * Đếm 1 hội thoại/kênh/tháng khi tenant gửi outbound (F1 race-safe).
     *
     * Step 1: 1 UPDATE compare-set trên Conversation.last_metered_period
     *         WHERE last_metered_period IS NULL OR != currentPeriod()
     *         → affected_rows = 0: đã đếm kỳ này (race thua hoặc trùng) → early-return
     *         → affected_rows = 1: thắng race → tăng channel_usage
     *
     * Step 2: Atomic upsert channel_usage ON CONFLICT (workspace_id, channel, period)
     *         DO UPDATE SET answered_count = answered_count + 1
     *
     * Idempotent: gọi 2 lần cùng kỳ → chỉ đếm 1 lần.
     */
    public function meterReply(Conversation $conversation): void
    {
        $period = $this->currentPeriod();
        $workspaceId = $conversation->workspace_id;
        $channel = $conversation->channel;

        // F9-audit: bọc cả 2 step trong transaction — compare-set + upsert hoặc cả hai rollback.
        // Nếu upsert fail sau compare-set → conversation.last_metered_period được rollback
        // → lần sau retry meterReply được (không under-count vĩnh viễn).
        DB::transaction(function () use ($conversation, $period, $workspaceId, $channel) {
            // Step 1: compare-set atomic — chỉ 1 request thắng race
            $affected = Conversation::withoutGlobalScope('workspace')
                ->where('id', $conversation->id)
                ->where(function ($query) use ($period) {
                    $query->whereNull('last_metered_period')
                        ->orWhere('last_metered_period', '!=', $period);
                })
                ->update(['last_metered_period' => $period]);

            if ($affected === 0) {
                // Đã đếm kỳ này (hoặc request khác thắng race) → early-return idempotent
                return;
            }

            // Step 2: upsert channel_usage atomic (cùng transaction với step 1)
            DB::statement(
                'INSERT INTO channel_usage (id, workspace_id, channel, period, answered_count, created_at, updated_at)
                 VALUES (gen_random_uuid(), ?, ?, ?, 1, now(), now())
                 ON CONFLICT (workspace_id, channel, period)
                 DO UPDATE SET answered_count = channel_usage.answered_count + 1, updated_at = now()',
                [$workspaceId, $channel, $period]
            );
        });
    }

    /**
     * Kỳ hiện tại theo múi giờ VN: 'YYYY-MM'.
     */
    public function currentPeriod(): string
    {
        return now('Asia/Ho_Chi_Minh')->format('Y-m');
    }
}
