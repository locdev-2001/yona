<?php

namespace App\Modules\Chat\Intake\Event;

use App\Modules\Chat\Intake\InboundEvent;
use App\Modules\Chat\Intake\InboundEventType;
use Carbon\CarbonInterface;

/**
 * Khách bấm nút hoặc gửi ô nhập trong một tin.
 *
 * KHÔNG giả lập thành tin chữ: `actionId` là thứ người gửi tin đã đặt ra và
 * dựa vào để hiểu phản hồi. Biến nó thành chữ là mất đi cái duy nhất máy đọc
 * được — và đây chính là điểm nối cho harness tự động trả lời sau này.
 */
final class ActionSubmitted extends InboundEvent
{
    /**
     * @param  array<string, mixed>  $values  ô nhập trả nhiều trường
     * @param  array<string, mixed>  $channelRef
     */
    public function __construct(
        string $channel,
        ?string $accountId,
        string $senderUid,
        public readonly string $actionId,
        public readonly array $values = [],
        public readonly ?string $inReplyToSourceId = null,
        ?CarbonInterface $occurredAt = null,
        array $channelRef = [],
    ) {
        parent::__construct($channel, $accountId, $senderUid, $occurredAt, $channelRef);
    }

    public function type(): InboundEventType
    {
        return InboundEventType::ActionSubmitted;
    }
}
