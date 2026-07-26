<?php

namespace App\Modules\Identity\Resolve;

/**
 * Chuẩn hóa số điện thoại về một dạng duy nhất.
 *
 * Sống ở tầng định danh vì "một số điện thoại là một người" là luật của tầng
 * này: hai cách viết cùng một số mà không quy về một dạng thì ràng buộc duy nhất
 * trên `(workspace_id, 'phone', value)` không chặn được gì.
 */
class PhoneNormalizer
{
    public function normalize(?string $phone): ?string
    {
        if ($phone === null || $phone === '') {
            return null;
        }

        $digits = preg_replace('/\D/', '', $phone) ?? '';

        if ($digits === '') {
            return null;
        }

        // 84xxxxxxxxx → 0xxxxxxxxx
        if (strlen($digits) === 11 && str_starts_with($digits, '84')) {
            $digits = '0'.substr($digits, 2);
        }

        // xxxxxxxxx (thiếu số 0 đầu) → 0xxxxxxxxx
        if (strlen($digits) === 9 && ! str_starts_with($digits, '0')) {
            $digits = '0'.$digits;
        }

        return strlen($digits) === 10 && str_starts_with($digits, '0') ? $digits : null;
    }
}
