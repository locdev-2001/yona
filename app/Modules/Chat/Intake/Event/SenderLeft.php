<?php

namespace App\Modules\Chat\Intake\Event;

use App\Modules\Chat\Intake\InboundEvent;
use App\Modules\Chat\Intake\InboundEventType;

/**
 * Một người rời nhóm.
 */
final class SenderLeft extends InboundEvent
{
    public function type(): InboundEventType
    {
        return InboundEventType::SenderLeft;
    }
}
