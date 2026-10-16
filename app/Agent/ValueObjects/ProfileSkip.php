<?php

namespace App\Agent\ValueObjects;

// Vì sao một trường khách khai không được ghi vào hồ sơ.
enum ProfileSkip: string
{
    // Hồ sơ đã có giá trị khác: không ghi đè dữ liệu shop đang có.
    case AlreadySet = 'already_set';
    // SĐT/email đang thuộc hồ sơ khác: không ghi, không tự gộp hai hồ sơ.
    case BelongsToAnotherProfile = 'belongs_to_another_profile';
    case InvalidFormat = 'invalid_format';
    // Shop chưa định nghĩa thuộc tính này cho khách.
    case UnknownAttribute = 'unknown_attribute';
    // Giá trị không nằm trong danh sách lựa chọn của thuộc tính.
    case NotAnOption = 'not_an_option';
}
