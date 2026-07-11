<?php

namespace App\Services\Inbox;

use App\Models\Conversation;
use App\Models\Message;
use App\Services\ContactService;
use Illuminate\Support\Carbon;

/**
 * P05 — enrich SĐT khách, mở khóa quy tắc #1 CDP (chống trùng theo SĐT).
 *
 * CHỈ 2 nguồn cho phép (BLK-5: CẤM harvest hàng loạt — rủi ro khóa acc Zalo duy nhất):
 *  1. business_card khách CHỦ ĐỘNG gửi (A1 consent-by-conduct) — DB thuần, 0 API call
 *  2. nhập tay + verify findUser (controller gọi applyPhone sau khi driver verify)
 *
 * Thứ tự mạnh: manual_verified > business_card > friend_profile > unverified.
 * Cùng hạng = take-latest (cho sửa typo); KHÔNG ghi đè nguồn mạnh bằng yếu.
 * SĐT chảy vào ContactService dedup (rule #1) — KHÔNG auto-enroll tệp gửi chủ động/QC.
 */
class PhoneEnrichmentService
{
    private const SOURCE_STRENGTH = [
        'unverified' => 0,
        'friend_profile' => 1,
        'business_card' => 2,
        'manual_verified' => 3,
    ];

    public function __construct(private readonly ContactService $contactService) {}

    /**
     * Lift SĐT từ danh thiếp khách gửi (chỉ 1-1, chỉ inbound = khách tự gửi).
     */
    public function liftFromBusinessCard(Message $message): bool
    {
        if ($message->type !== 'business_card' || $message->direction !== 'in') {
            return false;
        }

        $conversation = $message->conversation;
        if ($conversation === null || $conversation->thread_type === 1) {
            return false;
        }

        $phone = $message->media_meta['business_card']['phone'] ?? null;
        if ($phone === null || (string) $phone === '') {
            return false;
        }

        return $this->applyPhone($conversation, (string) $phone, 'business_card');
    }

    /**
     * Áp SĐT với source tracking + dedup CDP. Trả false nếu phone không hợp lệ
     * hoặc nguồn yếu hơn nguồn hiện có.
     */
    public function applyPhone(Conversation $conversation, string $phone, string $source, ?Carbon $verifiedAt = null): bool
    {
        $normalized = $this->contactService->normalizePhone($phone);
        if ($normalized === null) {
            return false;
        }

        $newStrength = self::SOURCE_STRENGTH[$source] ?? 0;
        // peer_phone có sẵn nhưng phone_source null (data cũ) = 'unverified'
        $currentStrength = $conversation->peer_phone === null
            ? -1
            : (self::SOURCE_STRENGTH[$conversation->phone_source ?? 'unverified'] ?? 0);

        // Cùng hạng = take-latest (sửa typo); chỉ chặn khi nguồn MỚI yếu hơn
        if ($newStrength < $currentStrength) {
            return false;
        }

        $conversation->forceFill([
            'peer_phone' => $normalized,
            'phone_source' => $source,
            'phone_enriched_at' => now(),
            'phone_verified_at' => $verifiedAt,
        ])->save();

        $this->linkContact($conversation, $normalized);

        return true;
    }

    /**
     * Quy tắc #1: gộp 1 người từ nhiều nguồn thành 1 hồ sơ — khóa chính = SĐT.
     * Conversation chưa có contact → link; đã có contact KHÁC → flag merge review
     * (KHÔNG auto-merge — Finding 18).
     */
    private function linkContact(Conversation $conversation, string $normalizedPhone): void
    {
        $contact = $this->contactService->resolveOrCreateFromPeer(
            $conversation->workspace_id,
            $conversation->channel,
            $conversation->peer_uid,
            $normalizedPhone,
            $conversation->peer_name,
        );

        if ($contact === null) {
            return;
        }

        if ($conversation->contact_id === null) {
            $conversation->forceFill(['contact_id' => $contact->id])->save();

            return;
        }

        if ($conversation->contact_id !== $contact->id) {
            $this->contactService->mergeIdentities($conversation->workspace_id, $conversation->contact_id, $contact->id);
        }
    }
}
