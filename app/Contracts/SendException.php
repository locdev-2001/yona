<?php

namespace App\Contracts;

/**
 * Base exception cho outbound send failures — inbox-agnostic.
 *
 * Channel drivers (Integration/Chat/*, ...) wrap lỗi kênh bằng exception con
 * của SendException để InboxController bắt 1 lần duy nhất.
 *
 * error_code values dùng chung (FE hiển thị toast theo code):
 *   - 'quota_exceeded'  — hết quota billing
 *   - 'circuit_open'    — circuit breaker mở, kênh bị treo
 *   - 'outside_window'  — ngoài cửa sổ giờ cho phép
 *   - 'rate_cap'        — vượt giới hạn tần suất
 *   - 'not_connected'   — kênh chưa kết nối / session hết
 *   - 'split_brain'     — >1 phiên connected cùng lúc cho 1 tài khoản (fail-closed)
 */
class SendException extends \RuntimeException
{
    public function __construct(
        string $message,
        public readonly string $errorCode = 'send_error',
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }
}
