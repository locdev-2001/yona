<?php

namespace Modules\Inbox\Exceptions;

/**
 * Ném khi tenant hết quota hội thoại mới trong kỳ hiện tại.
 *
 * Single source of truth — ConversationMeter (billing) dùng exception này,
 * billing QuotaExceededException cũ sẽ trở thành alias hoặc bị loại bỏ dần.
 *
 * InboxController bắt RuntimeException + str_contains(get_class, 'Quota') → 422,
 * nên class này kế thừa RuntimeException là đủ (không phải SendException).
 *
 * @see Modules\Inbox\Contracts\MeteringGate::assertCanSend
 * @see Modules\Billing\Services\ConversationMeter::assertCanSend
 */
class QuotaExceededException extends \RuntimeException
{
    public function __construct(string $message = 'Hết quota hội thoại gói hiện tại')
    {
        parent::__construct($message);
    }
}
