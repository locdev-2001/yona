<?php

namespace App\Services\Yona;

use App\Models\Channel\Yona;
use App\Services\Channels\BaseSendOnChannelService;

class SendOnYonaService extends BaseSendOnChannelService
{
    protected function channelClass(): string
    {
        return Yona::class;
    }

    protected function performReply(): void
    {
        app(YonaRelay::class)->deliver($this->message);
    }
}
