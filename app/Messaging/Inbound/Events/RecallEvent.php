<?php

namespace App\Messaging\Inbound\Events;

final class RecallEvent implements InboundEvent
{
    public function __construct(public readonly string $targetSourceId) {}
}
