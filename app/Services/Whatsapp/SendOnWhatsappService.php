<?php

namespace App\Services\Whatsapp;

use App\Models\Channel\Whatsapp;
use App\Services\Channels\BaseSendOnChannelService;

// Ủy quyền hoàn toàn cho driver của nhà cung cấp.
class SendOnWhatsappService extends BaseSendOnChannelService
{
    protected function channelClass(): string
    {
        return Whatsapp::class;
    }

    protected function performReply(): void
    {
        $messageId = $this->channel()->providerService()->sendMessage((string) $this->sourceId(), $this->message);

        if (filled($messageId)) {
            $this->message->update(['source_id' => $messageId]);
        }
    }
}
