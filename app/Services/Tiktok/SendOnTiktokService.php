<?php

namespace App\Services\Tiktok;

use App\Models\Channel\Tiktok;
use App\Services\Channels\BaseSendOnChannelService;
use App\Services\Channels\ChannelMessageStatus;
use App\Services\Messages\StatusUpdateService;
use Throwable;

// Port từ refs/chatwoot/app/services/tiktok/send_on_tiktok_service.rb
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
            $messageId = (new TiktokClient($this->channel()))->sendTextMessage(
                (string) data_get($this->conversation()->additional_attributes, 'conversation_id'),
                $this->message->content,
                $this->message->content_attributes['in_reply_to_external_id'] ?? null,
            );

            $this->message->update(['source_id' => $messageId]);
            (new StatusUpdateService($this->message, 'delivered'))->perform();
        } catch (Throwable $exception) {
            ChannelMessageStatus::fail($this->message, $exception->getMessage());
        }
    }
}
