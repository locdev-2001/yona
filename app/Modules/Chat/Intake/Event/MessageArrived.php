<?php

namespace App\Modules\Chat\Intake\Event;

use App\Modules\Chat\Intake\InboundEvent;
use App\Modules\Chat\Intake\InboundEventType;
use Carbon\CarbonInterface;

/**
 * Một tin mới đến.
 */
final class MessageArrived extends InboundEvent
{
    /**
     * @param  array<string, mixed>  $mediaMeta
     * @param  array<string, mixed>  $channelRef
     */
    public function __construct(
        string $channel,
        ?string $accountId,
        string $senderUid,
        public readonly ?string $sourceId,
        public readonly string $messageType,
        public readonly ?string $body = null,
        public readonly ?string $mediaUrl = null,
        public readonly array $mediaMeta = [],
        ?CarbonInterface $occurredAt = null,
        array $channelRef = [],
    ) {
        parent::__construct($channel, $accountId, $senderUid, $occurredAt, $channelRef);
    }

    public function type(): InboundEventType
    {
        return InboundEventType::MessageArrived;
    }
}
