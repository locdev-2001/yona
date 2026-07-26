<?php

namespace App\Modules\Chat\Delivery\Exception;

use RuntimeException;

/**
 * Tổ hợp nội dung không soạn thành tin được.
 *
 * Mang `errorCode` cùng khuôn với `App\Contracts\SendException` để biên vào dịch
 * sang HTTP theo một cách duy nhất.
 */
final class ComposeMessageException extends RuntimeException
{
    public function __construct(string $message, public readonly string $errorCode)
    {
        parent::__construct($message);
    }
}
