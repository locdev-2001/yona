<?php

namespace App\Services;

use Modules\Cdp\Contracts\IdentityResolver;
use App\Contracts\ContactRepository;
use App\Models\Contact;
use App\Support\Activity\ActivityLogger;

/**
 * Phase-07 — impl thật của IdentityResolver contract (cdp).
 *
 * Đặt trong crm-sales vì cần Contact model + ContactRepository.
 * crm-sales depends: ["cdp"] → có thể implement cdp contract, không vòng phụ thuộc.
 * Binding: CrmSalesServiceProvider::register() override binding no-op của CdpServiceProvider.
 *
 * Quy tắc mergeIdentities: KHÔNG auto-merge — chỉ flag needs_merge_review + audit log.
 * Repoint Conversation.contact_id chỉ sau khi tenant xác nhận (Phase-07 conv→Lead step).
 */
class CdpIdentityResolverImpl implements IdentityResolver
{
    public function __construct(
        private readonly ContactRepository $contacts,
        private readonly ActivityLogger $activityLogger,
    ) {}

    /**
     * Tìm Contact theo SĐT đã chuẩn hóa trong workspace.
     * TenantScope phải được bind trước khi gọi (webhook middleware bind).
     */
    public function resolveByPhone(string $workspaceId, ?string $phone): ?object
    {
        if ($phone === null) {
            return null;
        }

        $normalized = $this->contacts->normalizePhone($phone);
        if ($normalized === null) {
            return null;
        }

        return $this->contacts->findByPhone($normalized);
    }

    /**
     * Tìm hoặc tạo Contact từ thông tin peer kênh.
     *
     * Không có phone → trả null (Conversation giữ contact_id = NULL = Liên hệ nháp).
     * Có phone → firstOrCreateByPhone (idempotent).
     *
     * Finding 18: mergeIdentities KHÔNG được gọi tự động ở đây — chỉ flag needs_merge_review
     * sau khi tenant xác nhận (Phase-07 admin UI). API mergeIdentities() là hoãn lại (deferred).
     */
    public function resolveOrCreateFromPeer(
        string $workspaceId,
        string $channel,
        string $peerUid,
        ?string $phone,
        ?string $displayName,
    ): ?object {
        if ($phone === null) {
            return null;
        }

        $normalized = $this->contacts->normalizePhone($phone);
        if ($normalized === null) {
            return null;
        }

        return $this->contacts->firstOrCreateByPhone($normalized, $displayName);
    }

    /**
     * Flag 2 contact cần review — KHÔNG auto-merge.
     *
     * Set needs_merge_review = true + merge_review_with trên cả 2 contact.
     * Ghi audit log 'contact.merge_review_flagged'.
     * Repoint chỉ sau khi admin/tenant xác nhận (Phase-07 admin UI step sau).
     */
    public function mergeIdentities(
        string $workspaceId,
        string $primaryContactId,
        string $duplicateContactId,
    ): void {
        $primary = Contact::find($primaryContactId);
        $duplicate = Contact::find($duplicateContactId);

        if ($primary === null || $duplicate === null) {
            return;
        }

        // Idempotent: đã flag rồi thì skip
        if ($primary->needs_merge_review && $primary->merge_review_with === $duplicateContactId) {
            return;
        }

        // Flag cả hai phía (reviewer thấy từ cả 2 view)
        $primary->needs_merge_review = true;
        $primary->merge_review_with = $duplicateContactId;
        $primary->saveQuietly(); // bypass audit observer (tránh lặp log)

        $duplicate->needs_merge_review = true;
        $duplicate->merge_review_with = $primaryContactId;
        $duplicate->saveQuietly();

        // Ghi audit log thay cho observer
        $this->activityLogger->log($primary, 'contact.merge_review_flagged', [
            'duplicate_contact_id' => $duplicateContactId,
            'reason' => 'same_phone',
        ]);
    }
}
