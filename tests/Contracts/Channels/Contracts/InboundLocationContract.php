<?php

namespace Tests\Contracts\Channels\Contracts;

use App\Channels\Capability;
use App\Models\Attachment;
use App\Models\Message;
use Tests\Contracts\Channels\Harness\ChannelHarness;

/** §2.1 inbound_location — vị trí là đính kèm `location` mang toạ độ; bong bóng bản đồ của lõi dùng chung. */
final class InboundLocationContract extends ChannelContract
{
    public static function capability(): Capability
    {
        return Capability::InboundLocation;
    }

    public function assert(ChannelHarness $harness): void
    {
        $message = $harness->receiveInbound(self::capability())->fresh(['attachments']);
        $location = $message->attachments->first();

        expect($message->message_type)->toBe(Message::TYPE_INCOMING)
            ->and($message->attachments)->toHaveCount(1)
            ->and($location->file_type)->toBe(Attachment::FILE_TYPE_LOCATION)
            ->and((float) $location->coordinates_lat)->not->toBe(0.0)
            ->and((float) $location->coordinates_long)->not->toBe(0.0);
    }
}
