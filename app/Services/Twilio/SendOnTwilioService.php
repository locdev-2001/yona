<?php

namespace App\Services\Twilio;

use App\Models\Channel\TwilioSms;
use App\Services\Channels\BaseSendOnChannelService;
use App\Services\Channels\ChannelMessageStatus;

// Port từ refs/chatwoot/app/services/twilio/send_on_twilio_service.rb (đường
// gửi tin thường; content template CSAT chưa port — xem note).
class SendOnTwilioService extends BaseSendOnChannelService
{
    protected function channelClass(): string
    {
        return TwilioSms::class;
    }

    protected function performReply(): void
    {
        $channel = $this->channel();

        $params = [
            ...$channel->sendMessageFrom(),
            'To' => $this->sourceId(),
            'Body' => $this->message->outgoingContent(),
            'StatusCallback' => route('twilio.delivery_status'),
        ];

        foreach ($this->message->attachments as $index => $attachment) {
            $params["MediaUrl[{$index}]"] = $attachment->downloadUrl();
        }

        $response = (new TwilioClient($channel))->createMessage($params);

        if ($response->successful()) {
            $this->message->update(['source_id' => $response->json('sid')]);

            return;
        }

        ChannelMessageStatus::fail($this->message, (string) $response->json('message'));
    }
}
