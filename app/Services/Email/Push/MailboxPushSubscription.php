<?php

namespace App\Services\Email\Push;

use Carbon\CarbonImmutable;

final class MailboxPushSubscription
{
    public function __construct(
        public readonly CarbonImmutable $expiresAt,
        public readonly ?string $cursor = null,
    ) {}
}
