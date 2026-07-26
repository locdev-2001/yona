<?php

namespace App\Modules\Chat\Intake\Event;

use App\Modules\Chat\Intake\InboundEvent;
use App\Modules\Chat\Intake\InboundEventType;
use Carbon\CarbonInterface;

/**
 * Nhà cung cấp phát ra thứ ta chưa biết đọc.
 *
 * Bắt buộc phải có: Zalo cá nhân là API không chính thức, nó đổi bất ngờ được.
 * Cách ly nguyên khối — đừng đoán bừa thành loại gần giống, và cũng đừng nuốt
 * im lặng rồi mất dấu vết khi cần lần lại.
 */
final class UnrecognizedInbound extends InboundEvent
{
    /** @param array<string, mixed> $channelRef */
    public function __construct(
        string $channel,
        ?string $accountId,
        string $senderUid,
        public readonly ?string $rawKind = null,
        ?CarbonInterface $occurredAt = null,
        array $channelRef = [],
    ) {
        parent::__construct($channel, $accountId, $senderUid, $occurredAt, $channelRef);
    }

    public function type(): InboundEventType
    {
        return InboundEventType::Unrecognized;
    }
}
