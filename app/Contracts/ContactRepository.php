<?php

namespace App\Contracts;

use App\Models\Contact;

/**
 * ContactRepository contract — phơi cho cdp IdentityResolver (Phase 07).
 * cdp gọi qua contract này để dedup golden profile mà không import Model trực tiếp.
 *
 * Phase-07 thêm: normalizePhone, firstOrCreateByPhone (dedup theo SĐT VN).
 */
interface ContactRepository
{
    /**
     * Find a contact by phone number within the current workspace.
     */
    public function findByPhone(string $phone): ?Contact;

    /**
     * Find a contact by email address within the current workspace.
     */
    public function findByEmail(string $email): ?Contact;

    /**
     * Create a draft contact (client_id nullable — "Liên hệ nháp").
     *
     * @param  array<string, mixed>  $attrs
     */
    public function createDraft(array $attrs): Contact;

    /**
     * Chuẩn hóa SĐT VN về dạng '0xxxxxxxxx'.
     *
     * Quy tắc:
     *  - Loại bỏ mọi ký tự không phải chữ số.
     *  - Tiền tố '84xxx' (11 chữ số) → '0xxx'.
     *  - Kết quả rỗng / không hợp lệ → null.
     *  - Chuỗi trống → null.
     */
    public function normalizePhone(?string $phone): ?string;

    /**
     * Tìm hoặc tạo Contact theo SĐT chuẩn hóa trong workspace hiện tại.
     *
     * - Chuẩn hóa phone trước khi tra.
     * - Trả contact đã có nếu (workspace_id, phone) khớp.
     * - Tạo draft contact mới (client_id = null) nếu chưa có.
     * - Bắt unique-violation (race condition) → re-fetch idempotent.
     *
     * @throws \InvalidArgumentException Khi phone không hợp lệ sau chuẩn hóa.
     */
    public function firstOrCreateByPhone(string $phone, ?string $name = null): Contact;
}
