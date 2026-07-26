<?php

namespace App\Services;

use App\Models\Contact;
use App\Support\Activity\ActivityLogger;
use Illuminate\Database\QueryException;

/**
 * ContactService — single source of truth cho dedup hồ sơ khách (CDP Layer 1, "chống trùng").
 *
 * Gộp truy vấn Contact (findByPhone/findByEmail/createDraft/normalizePhone/firstOrCreateByPhone)
 * + identity-resolution (resolveByPhone/resolveOrCreateFromPeer/mergeIdentities).
 * Callers (inbox, tests) resolve concrete class trực tiếp — không còn interface/no-op.
 *
 * normalizePhone: VN-only, no libphonenumber dep (ponytail: đủ cho GĐ1 inbox Zalo VN).
 * firstOrCreateByPhone: bắt unique-violation PostgreSQL (error code 23505) → re-fetch.
 *
 * Quy tắc mergeIdentities: KHÔNG auto-merge — chỉ flag needs_merge_review + audit log.
 * Repoint Conversation.contact_id chỉ sau khi tenant xác nhận (conv→Lead step).
 */
class ContactService
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
    ) {}

    public function findByPhone(string $phone): ?Contact
    {
        return Contact::where('phone', $phone)
            ->where('workspace_id', currentWorkspace()->id)
            ->first();
    }

    public function findByEmail(string $email): ?Contact
    {
        return Contact::where('email', $email)
            ->where('workspace_id', currentWorkspace()->id)
            ->first();
    }

    /**
     * @param  array<string, mixed>  $attrs
     */
    public function createDraft(array $attrs): Contact
    {
        $contact = new Contact;
        $contact->fill($attrs);
        $contact->save();

        return $contact;
    }

    /**
     * Chuẩn hóa SĐT VN → '0xxxxxxxxx'.
     *
     * ponytail: rule VN đơn giản, không cần libphonenumber.
     * Ceiling: số quốc tế non-VN sẽ trả null. Nâng cấp khi mở rộng kênh quốc tế.
     */
    public function normalizePhone(?string $phone): ?string
    {
        if ($phone === null || $phone === '') {
            return null;
        }

        // Loại bỏ mọi ký tự không phải chữ số
        $digits = preg_replace('/\D/', '', $phone) ?? '';

        if ($digits === '') {
            return null;
        }

        // 84xxxxxxxxx (11 chữ số, bắt đầu bằng 84) → 0xxxxxxxxx
        if (strlen($digits) === 11 && str_starts_with($digits, '84')) {
            $digits = '0'.substr($digits, 2);
        }

        // Finding 19a: '840' + 9 chữ số (12 ký tự) — Zalo trả dạng này (country code 84 + 0 + 9 digits)
        // Ví dụ: '840901234567' → '0901234567'
        if (strlen($digits) === 12 && str_starts_with($digits, '840')) {
            $digits = '0'.substr($digits, 3);
        }

        // Finding 19b: 9 chữ số không bắt đầu bằng 0 → thử thêm '0' để thành 10 số VN hợp lệ
        // Ví dụ: '901234567' → '0901234567'
        if (strlen($digits) === 9 && ! str_starts_with($digits, '0')) {
            $digits = '0'.$digits;
        }

        // SĐT VN hợp lệ: 10 chữ số, bắt đầu bằng 0
        if (strlen($digits) !== 10 || ! str_starts_with($digits, '0')) {
            return null;
        }

        return $digits;
    }

    /**
     * Tìm hoặc tạo Contact theo SĐT trong workspace hiện tại.
     * Idempotent: 2 call cùng phone → cùng 1 Contact.
     */
    public function firstOrCreateByPhone(string $phone, ?string $name = null): Contact
    {
        $normalized = $this->normalizePhone($phone);

        if ($normalized === null) {
            throw new \InvalidArgumentException("SĐT không hợp lệ sau chuẩn hóa: {$phone}");
        }

        $workspace = currentWorkspace();

        // Happy path: đã tồn tại
        $existing = Contact::where('workspace_id', $workspace->id)
            ->where('phone', $normalized)
            ->first();

        if ($existing !== null) {
            return $existing;
        }

        // Tạo mới draft contact (client_id = null = Liên hệ nháp)
        try {
            $nameParts = $name ? explode(' ', trim($name), 2) : [''];
            $contact = new Contact;
            $contact->first_name = $nameParts[0] ?: 'Khách';
            $contact->last_name = $nameParts[1] ?? null;
            $contact->phone = $normalized;
            // workspace_id set qua BelongsToWorkspace concern (currentWorkspace())
            $contact->save();

            return $contact;
        } catch (QueryException $e) {
            // PostgreSQL unique-violation = SQLSTATE 23505 (partial unique contacts_workspace_phone_unique).
            // Finding 14: dùng $e->getCode() === '23505' thay vì so chuỗi message —
            // message có thể thay đổi theo locale/PG version; SQLSTATE code thì ổn định.
            if ($e->getCode() === '23505') {
                // Race condition: re-fetch contact đã được tạo bởi request khác
                $contact = Contact::where('workspace_id', $workspace->id)
                    ->where('phone', $normalized)
                    ->first();

                if ($contact !== null) {
                    return $contact;
                }
            }

            throw $e;
        }
    }

    /**
     * Tìm Contact theo SĐT đã chuẩn hóa trong workspace.
     * TenantScope phải được bind trước khi gọi (webhook middleware bind).
     */
    public function resolveByPhone(string $workspaceId, ?string $phone): ?object
    {
        if ($phone === null) {
            return null;
        }

        $normalized = $this->normalizePhone($phone);
        if ($normalized === null) {
            return null;
        }

        return $this->findByPhone($normalized);
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
        string $senderUid,
        ?string $phone,
        ?string $displayName,
    ): ?object {
        if ($phone === null) {
            return null;
        }

        $normalized = $this->normalizePhone($phone);
        if ($normalized === null) {
            return null;
        }

        return $this->firstOrCreateByPhone($normalized, $displayName);
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
