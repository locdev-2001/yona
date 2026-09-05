<?php

namespace App\Support;

// Tham số boolean tới từ ba nguồn: JSON (bool thật), multipart/form-data và
// query string (chuỗi '1'/'0'/'true'/'false'). Rails ép kiểu ngay ở tầng params
// nên bản gốc không phải nghĩ; PHP thì `(bool) 'false' === true`, đã có lúc biến
// mọi tin gửi kèm tệp thành ghi chú riêng tư. Mọi chỗ đọc cờ boolean từ request
// đi qua đây.
final class BooleanParam
{
    public static function from(mixed $value, bool $default = false): bool
    {
        if ($value === null || $value === '') {
            return $default;
        }

        return filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? $default;
    }
}
