<?php

namespace App\Services\Channels;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

/**
 * Kiểm thông tin đăng nhập của một kênh TRƯỚC khi lưu (model đã fill, chưa save).
 * Sai thì ném lỗi validation gắn vào ô `channel.*` để form báo tại chỗ.
 */
interface VerifiesChannelCredentials
{
    /** @throws ValidationException */
    public function verify(Model $channel): void;
}
