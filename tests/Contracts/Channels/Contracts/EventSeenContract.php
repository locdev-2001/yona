<?php

namespace Tests\Contracts\Channels\Contracts;

use App\Channels\Capability;
use App\Models\Message;
use Tests\Contracts\Channels\Harness\ChannelHarness;

/** §2.3 event_seen — biên nhận "đã xem" của kênh nâng trạng thái tin đi lên `read`, và chỉ nâng. */
final class EventSeenContract extends ChannelContract
{
    public static function capability(): Capability
    {
        return Capability::EventSeen;
    }

    public function assert(ChannelHarness $harness): void
    {
        $conversation = $harness->conversation();
        $outgoing = $conversation->messages()->create([
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
            'message_type' => Message::TYPE_OUTGOING,
            'content' => 'tin chờ biên nhận',
            'source_id' => 'contract-seen-1',
            'status' => Message::STATUSES['sent'],
        ]);

        $harness->receiveEvent(self::capability(), $outgoing);

        expect($outgoing->fresh()->status)->toBe(Message::STATUSES['read']);
    }
}
