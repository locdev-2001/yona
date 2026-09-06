<?php

namespace Tests\Contracts\Channels\Contracts;

use App\Channels\Capability;
use App\Models\Attachment;
use App\Models\Message;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Contracts\Channels\Harness\ChannelHarness;

/**
 * §2.2 outbound_file (đại diện cho cả outbound_image/video/audio) — MỌI đính kèm
 * của một tin đều phải đi ra kênh, không chỉ cái đầu tiên.
 */
final class OutboundAttachmentsContract extends ChannelContract
{
    public static function capability(): Capability
    {
        return Capability::OutboundFile;
    }

    public function assert(ChannelHarness $harness): void
    {
        Storage::fake('public');

        $conversation = $harness->conversation();
        $message = $conversation->messages()->create([
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
            'message_type' => Message::TYPE_OUTGOING,
            'content' => 'hai tệp',
        ]);

        foreach (['mot.png', 'hai.png'] as $filename) {
            $message->attachments()->create(
                Attachment::storeUpload(UploadedFile::fake()->image($filename), $message->account_id),
            );
        }

        $message = $this->readyToSend($message);
        $sent = $harness->sendOutbound($message)->flattened();

        foreach ($message->attachments as $attachment) {
            expect($sent)->toContain($attachment->downloadUrl());
        }
    }
}
