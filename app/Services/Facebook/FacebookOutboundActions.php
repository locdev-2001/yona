<?php

namespace App\Services\Facebook;

use App\Models\Conversation;
use App\Services\Meta\MetaOutboundActions;
use Illuminate\Http\Client\Response;

final class FacebookOutboundActions extends MetaOutboundActions
{
    protected function send(Conversation $conversation, array $payload): Response
    {
        return (new FacebookGraphClient($conversation->inbox->channel))->sendMessage($payload);
    }
}
