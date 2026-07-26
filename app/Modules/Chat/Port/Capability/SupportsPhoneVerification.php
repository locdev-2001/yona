<?php

namespace App\Modules\Chat\Port\Capability;

use App\Models\Conversation;

/**
 * Kênh kiểm chứng được "số điện thoại này có đúng là của người đang chat không".
 *
 * Kênh không hỗ trợ ⇒ ta KHÔNG lưu số nhập tay (không nhận dữ liệu chưa xác minh),
 * chứ không phải lưu tạm rồi xác minh sau.
 */
interface SupportsPhoneVerification
{
    /** @return bool false = không resolve được HOẶC resolve ra người khác */
    public function verifySenderPhone(Conversation $conversation, string $phone): bool;
}
