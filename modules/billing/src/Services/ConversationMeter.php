<?php

namespace Modules\Billing\Services;

use Illuminate\Support\Facades\DB;
use Modules\Billing\Enums\TenantEntitlement;
use Modules\Inbox\Contracts\MeteringGate;
use Modules\Inbox\Exceptions\QuotaExceededException;
use Modules\Inbox\Models\Conversation;

/**
 * ConversationMeter — impl thật của MeteringGate (override AllowAllMeteringGate).
 *
 * F1 race-safe: meterReply dùng 1 UPDATE compare-set + ON CONFLICT DO UPDATE.
 * F5: canReplyOnExisting = luôn true nếu conv.last_metered_period == currentPeriod()
 *     (hội thoại đã tính kỳ này → vẫn trả lời được kể cả hết quota).
 * F13/F20: canStartNew gate hội thoại MỚI; canReplyOnExisting KHÔNG bao giờ false.
 * F10: BillingServiceProvider bind class này override AllowAllMeteringGate sau inbox boot.
 *
 * Isolation: KHÔNG import Models của channel-zalo (N1).
 */
class ConversationMeter implements MeteringGate
{
    public function __construct(private readonly EntitlementResolver $resolver) {}

    /**
     * Hội thoại đã tồn tại: luôn cho phép gửi.
     *
     * F5: nếu conv đã được meter trong kỳ hiện tại → không bao giờ chặn
     * kể cả remaining = 0.
     */
    public function canReplyOnExisting(Conversation $conversation): bool
    {
        // F5: conv đã tính kỳ này → luôn cho gửi (không kiểm quota)
        if ($conversation->last_metered_period === $this->currentPeriod()) {
            return true;
        }

        // Conv chưa tính kỳ này — kiểm quota còn không để fallback
        // (không chặn — hội thoại cũ vẫn được gửi; chỉ sẽ đếm khi meterReply)
        // ponytail: luôn true theo contract (F13/F20). Hội thoại cũ không bao giờ chặn.
        return true;
    }

    /**
     * Hội thoại MỚI: false khi hết quota.
     * Chỉ gọi từ OutboundController khi mở hội thoại mới — KHÔNG gọi từ webhook.
     */
    public function canStartNew(string $channel): bool
    {
        $workspaceId = currentWorkspace()?->id;
        if (! $workspaceId) {
            return true; // fail-open nếu không có context (không lý do để chặn)
        }

        $quotaKey = "quota.conversations.{$channel}";
        $remaining = $this->resolver->remaining($workspaceId, $quotaKey);

        return $remaining > 0;
    }

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

    /**
     * Assert hội thoại có thể gửi — contract MeteringGate (F1-audit).
     *
     * Conv đã metered kỳ này (last_metered_period == currentPeriod) → luôn pass.
     * Conv chưa metered kỳ này (mới hoặc kỳ cũ) + hết quota → throw.
     *
     * ZaloSendService gọi method này thay vì tự kiểm if (! canStartNew) { /* rỗng * / }.
     *
     * @throws QuotaExceededException
     */
    public function assertCanSend(Conversation $conversation): void
    {
        // Conv đã tính kỳ này → luôn cho gửi (F5)
        if ($conversation->last_metered_period === $this->currentPeriod()) {
            return;
        }

        // Conv chưa tính kỳ này → kiểm quota; nếu hết → chặn
        if (! $this->canStartNew($conversation->channel)) {
            throw new QuotaExceededException;
        }
    }
}
