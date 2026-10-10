<?php

namespace Tests\Contracts\Channels\Contracts;

use App\Channels\Capability;
use App\Models\Message;
use Tests\Contracts\Channels\Harness\ChannelHarness;

/** §2.3 event_delivered — biên nhận "đã giao" nâng tin đi từ `sent` lên `delivered`. */
final class EventDeliveredContract extends ChannelContract
{
    public static function capability(): Capability
    {
        return Capability::EventDelivered;
    }

    public function assert(ChannelHarness $harness): void
    {
        $conversation = $harness->conversation();
        $outgoing = $conversation->messages()->create([
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
            'message_type' => Message::TYPE_OUTGOING,
            'content' => 'tin chờ biên nhận giao',
            'source_id' => 'contract-delivered-1',
            'status' => Message::STATUSES['sent'],
        ]);

        $harness->receiveEvent(self::capability(), $outgoing);

        expect($outgoing->fresh()->status)->toBe(Message::STATUSES['delivered']);
    }
}
