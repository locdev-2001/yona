<?php

namespace App\Modules\Chat\Intake\Event;

use App\Modules\Chat\Intake\InboundEvent;
use App\Modules\Chat\Intake\InboundEventType;

/**
 * Một người vào nhóm.
 */
final class SenderJoined extends InboundEvent
{
    public function type(): InboundEventType
    {
        return InboundEventType::SenderJoined;
    }
}
