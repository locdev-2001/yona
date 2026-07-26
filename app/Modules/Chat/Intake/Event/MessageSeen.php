<?php

namespace App\Modules\Chat\Intake\Event;

use App\Modules\Chat\Intake\InboundEvent;
use App\Modules\Chat\Intake\InboundEventType;
use Carbon\CarbonInterface;

/**
 * Khách đã xem tin ta gửi.
 */
final class MessageSeen extends InboundEvent
{
    /** @param array<string, mixed> $channelRef */
    public function __construct(
        string $channel,
        ?string $accountId,
        string $senderUid,
        public readonly string $targetSourceId,
        ?CarbonInterface $occurredAt = null,
        array $channelRef = [],
    ) {
        parent::__construct($channel, $accountId, $senderUid, $occurredAt, $channelRef);
    }

    public function type(): InboundEventType
    {
        return InboundEventType::MessageSeen;
    }
}
