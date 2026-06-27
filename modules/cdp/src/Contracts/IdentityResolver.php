<?php

namespace Modules\Cdp\Contracts;

/**
 * Contract cho identity-resolution / dedup hồ sơ khách hàng (CDP Layer 1).
 *
 * Phase-03: chỉ định nghĩa signature — no-op placeholder.
 * Phase-07 (inbox/cdp-dedup) cung cấp implementation thật (dedup theo SĐT,
 * resolveOrCreateFromPeer, mergeIdentities) qua CdpServiceProvider override.
 *
 * Quy tắc cross-module: caller không import class cụ thể từ modules khác —
 * chỉ resolve interface này từ container.
 *
 * @see modules/cdp/src/NoOpIdentityResolver.php  — default binding (Phase-03)
 * @see plans/260627-modular-standardization/phase-07-gd1-modules.md §cdp — impl thật
 */
interface IdentityResolver
{
    /**
     * Tìm hoặc trả null nếu không tìm thấy profile theo SĐT.
     *
     * SĐT phải được chuẩn hóa định dạng VN ('0xxx') trước khi gọi.
     * No-op trả null (chưa impl). Impl thật (Phase-07) tra Contact theo
     * partial unique (workspace_id, phone) và trả ContactRef hoặc null.
     *
     * @param  string  $workspaceId  UUID workspace (tenant scope)
     * @param  string|null  $phone  SĐT đã chuẩn hóa; null → luôn trả null
     * @return object|null ContactRef hoặc null; shape chốt ở Phase-07
     */
    public function resolveByPhone(string $workspaceId, ?string $phone): ?object;

    /**
     * Tìm hoặc tạo profile từ thông tin peer kênh (uid, phone tùy chọn, tên).
     *
     * Không có SĐT → trả null (Liên hệ nháp, contact_id IS NULL trên Conversation).
     * Có SĐT → firstOrCreateByPhone; trùng → flag needs_merge_review, không auto-merge.
     * Impl thật ở Phase-07; no-op luôn trả null (an toàn — Conversation giữ
     * contact_id = NULL cho đến khi Phase-07 override binding).
     *
     * @param  string  $channel  vd 'zalo_personal'
     * @param  string  $peerUid  UID trên kênh (zalo_uid, fb_uid, …)
     * @param  string|null  $phone  SĐT nếu kênh cung cấp
     * @param  string|null  $displayName  Tên hiển thị peer
     * @return object|null ContactRef hoặc null
     */
    public function resolveOrCreateFromPeer(
        string $workspaceId,
        string $channel,
        string $peerUid,
        ?string $phone,
        ?string $displayName,
    ): ?object;

    /**
     * Đánh dấu hai hồ sơ cần gộp (KHÔNG auto-merge).
     *
     * No-op không làm gì. Impl thật (Phase-07) set cờ needs_merge_review
     * trên cả hai record + ghi audit log; repoint Conversation.contact_id
     * chỉ sau khi tenant xác nhận (tránh gộp nhầm).
     *
     * @param  string  $primaryContactId  UUID contact giữ lại
     * @param  string  $duplicateContactId  UUID contact trùng cần gộp vào primary
     */
    public function mergeIdentities(
        string $workspaceId,
        string $primaryContactId,
        string $duplicateContactId,
    ): void;
}
