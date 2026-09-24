<?php

namespace App\Services\Sms;

use App\Models\Channel\Sms;
use App\Services\Channels\BaseSendOnChannelService;
use App\Services\Channels\ChannelMessageStatus;

// Port từ refs/chatwoot/app/services/sms/send_on_sms_service.rb (+ Channel::Sms#send_message).
class SendOnSmsService extends BaseSendOnChannelService
{
    protected function channelClass(): string
    {
        return Sms::class;
    }

    protected function performReply(): void
    {
        $channel = $this->channel();

        $body = [
            'to' => $this->sourceId(),
            'from' => $channel->phone_number,
            'text' => $this->message->outgoingContent(),
            'applicationId' => $channel->provider_config['application_id'] ?? null,
        ];

        if ($this->message->attachments()->exists()) {
            $body['media'] = $this->message->attachments->map->downloadUrl()->all();
        }

        $response = (new BandwidthClient($channel))->sendMessage($body);

        if ($response->successful()) {
            $this->message->update(['source_id' => $response->json('id')]);

            return;
        }

        ChannelMessageStatus::fail($this->message, $response->json('description'));
    }
}
