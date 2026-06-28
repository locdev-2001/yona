<?php

namespace App\Exceptions;

use App\Services\MeteringService;

/**
 * Ném khi tenant hết quota hội thoại mới trong kỳ hiện tại.
 *
 * Single source of truth — MeteringService ném exception này.
 *
 * InboxController bắt RuntimeException + str_contains(get_class, 'Quota') → 422,
 * nên class này kế thừa RuntimeException là đủ (không phải SendException).
 *
 * @see MeteringService::assertCanSend
 */
class QuotaExceededException extends \RuntimeException
{
    public function __construct(string $message = 'Hết quota hội thoại gói hiện tại')
    {
        parent::__construct($message);
    }
}
