<?php

namespace Tests\Contracts\Channels\Contracts;

use App\Channels\Capability;
use App\Models\Message;
use Tests\Contracts\Channels\Harness\ChannelHarness;

/** §2.3 event_recall — khách thu hồi thì tin bị đánh dấu xoá theo đúng cách lõi xoá tin (Message::markDeleted). */
final class EventRecallContract extends ChannelContract
{
    public static function capability(): Capability
    {
        return Capability::EventRecall;
    }

    public function assert(ChannelHarness $harness): void
    {
        $incoming = $harness->receiveInbound(Capability::InboundText);

        $harness->receiveEvent(self::capability(), $incoming);

        expect($incoming->fresh()->isDeleted())->toBeTrue();
    }
}
