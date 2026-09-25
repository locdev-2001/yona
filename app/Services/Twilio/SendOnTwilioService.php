<?php

namespace App\Services\Twilio;

use App\Messaging\Delivery\DeliveryPlanner;
use App\Models\Channel\TwilioSms;
use App\Services\Channels\BaseSendOnChannelService;
use App\Services\Channels\ChannelMessageStatus;

// Đường gửi tin thường; content template CSAT chưa có.
class SendOnTwilioService extends BaseSendOnChannelService
{
    protected function channelClass(): string
    {
        return TwilioSms::class;
    }

    protected function performReply(): void
    {
        $channel = $this->channel();

        // Không có nút/chip gốc — tin có lựa chọn (input_select, cards…) hạ xuống chữ kèm danh sách đánh số.
        $plan = app(DeliveryPlanner::class)->plan($this->message, $channel->capabilities());

        $params = [
            ...$channel->sendMessageFrom(),
            'To' => $this->sourceId(),
            'Body' => $plan->plainText(),
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
