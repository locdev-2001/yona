<?php

namespace App\Services\Tiktok;

use App\Messaging\Delivery\DeliveryPlanner;
use App\Models\Channel\Tiktok;
use App\Services\Channels\BaseSendOnChannelService;
use App\Services\Channels\ChannelMessageStatus;
use App\Services\Messages\StatusUpdateService;
use Throwable;

// (đường gửi văn bản; upload ảnh multipart chưa port — xem note).
class SendOnTiktokService extends BaseSendOnChannelService
{
    protected function channelClass(): string
    {
        return Tiktok::class;
    }

    protected function performReply(): void
    {
        try {
            // Không có nút/chip gốc — tin có lựa chọn (input_select, cards…) hạ xuống chữ kèm danh sách đánh số.
            $plan = app(DeliveryPlanner::class)->plan($this->message, $this->channel()->capabilities());

            $messageId = (new TiktokClient($this->channel()))->sendTextMessage(
                (string) data_get($this->conversation()->additional_attributes, 'conversation_id'),
                $plan->plainText(),
                $this->message->content_attributes['in_reply_to_external_id'] ?? null,
            );

            $this->message->update(['source_id' => $messageId]);
            (new StatusUpdateService($this->message, 'delivered'))->perform();
        } catch (Throwable $exception) {
            ChannelMessageStatus::fail($this->message, $exception->getMessage());
        }
    }
}
