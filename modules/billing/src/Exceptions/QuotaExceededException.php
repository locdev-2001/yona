<?php

namespace Modules\Billing\Exceptions;

use RuntimeException;

/**
 * Ném khi canStartNew(channel) = false (hết quota hội thoại mới).
 * OutboundController bắt và trả 422 + upgrade prompt.
 * KHÔNG ném khi inbound / canReplyOnExisting (F13/F20).
 */
class QuotaExceededException extends RuntimeException
{
    public function __construct(
        public readonly string $channel,
        public readonly string $quotaKey,
        string $message = ''
    ) {
        parent::__construct($message ?: "Quota exceeded for channel '{$channel}' (key: {$quotaKey})");
    }
}
