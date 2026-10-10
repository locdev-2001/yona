<?php

namespace App\Messaging\Inbound\Events;

final class EditEvent implements InboundEvent
{
    public function __construct(public readonly string $targetSourceId, public readonly ?string $text) {}
}
