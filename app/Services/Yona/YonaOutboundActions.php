<?php

namespace App\Services\Yona;

use App\Models\Conversation;
use App\Models\Message;
use App\Services\Channels\ChannelOutboundActions;

class YonaOutboundActions implements ChannelOutboundActions
{
    public function __construct(private readonly YonaRelay $relay) {}

    public function reaction(Message $message, ?string $emoji): array
    {
        $this->relay->react($message, $emoji);

        return ['ok' => true];
    }

    public function recall(Message $message): array
    {
        $this->relay->recall($message);

        return ['ok' => true];
    }

    public function typing(Conversation $conversation): void {}
}
