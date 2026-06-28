<?php

namespace Modules\Inbox\Contracts;

use Modules\Inbox\Models\Conversation;

/**
 * Contract metering hội thoại per-channel per-month (F1, F6, F13, F20).
 *
 * TÁCH FAIL-SAFE (F13/F20):
 *   - canReplyOnExisting: hội thoại ĐÃ tồn tại → LUÔN cho gửi (không bao giờ chặn)
 *   - canStartNew: hội thoại MỚI → chặn khi hết quota
 *   - meterReply: đếm 1 lần/kỳ/hội thoại (1 UPDATE compare-set)
 *
 * NGUYÊN TẮC BẮT BUỘC:
 *   - Webhook inbound MUST NOT gọi canStartNew/canReplyOnExisting.
 *     Inbound always-accept — không gate, không chặn, không exception.
 *   - Lỗi gate (exception/billing chết) → fail-safe: vẫn nhận inbound, không rớt lead.
 *   - canReplyOnExisting luôn trả true (cả no-op lẫn impl thật ConversationMeter).
 *
 * Inbox bind no-op default (register()). Billing override (depends:["inbox"] → boot sau).
 *
 * @see modules/inbox/src/Channel/AllowAllMeteringGate.php  — no-op default (disable-safe)
 * @see plans/260627-modular-standardization/phase-07-gd1-modules.md §MeteringGate
 */
interface MeteringGate
{
    /**
     * Hội thoại đã tồn tại (đã có message trước đó): LUÔN cho phép gửi.
     *
     * Return false chỉ khi impl tự quyết (hiện tại: không bao giờ).
     * ConversationMeter impl cũng luôn true cho path này.
     */
    public function canReplyOnExisting(Conversation $conversation): bool;

    /**
     * Hội thoại MỚI (tenant chủ động mở): false khi hết quota.
     *
     * Impl thật (ConversationMeter) check remaining quota từ EntitlementResolver.
     * No-op luôn true (tắt billing → vẫn gửi được — disable-safe).
     */
    public function canStartNew(string $channel): bool;

    /**
     * Đếm 1 hội thoại/kênh/tháng khi tenant gửi outbound (direction=out).
     *
     * Atomic compare-set trên Conversation.last_metered_period (F1):
     *   1 UPDATE WHERE last_metered_period != '{Y-m}' OR IS NULL
     *   → affected_rows=0 → đã đếm kỳ này → early-return (idempotent)
     *   → affected_rows=1 → upsert channel_usage (ON CONFLICT DO UPDATE count+1)
     *
     * No-op không làm gì (billing tắt → không đếm).
     */
    public function meterReply(Conversation $conversation): void;

    /**
     * Assert hội thoại có thể gửi; ném QuotaExceededException nếu không.
     *
     * Logic:
     *   - Conv đã có outbound trước đó (canReplyOnExisting) → luôn pass (không throw).
     *   - Conv mới kỳ này + hết quota → throw QuotaExceededException.
     *
     * ZaloSendService gọi method này thay vì tự kiểm canStartNew (F1-audit).
     * AllowAllMeteringGate: no-op (billing tắt → không chặn).
     * ConversationMeter: throw khi ! canReplyOnExisting (conv mới + hết quota).
     *
     * @throws \Modules\Inbox\Exceptions\QuotaExceededException
     */
    public function assertCanSend(Conversation $conversation): void;
}
