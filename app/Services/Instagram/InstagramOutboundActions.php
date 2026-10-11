<?php

namespace App\Services\Instagram;

use App\Models\Channel\Instagram;
use App\Models\Conversation;
use App\Services\Meta\MetaOutboundActions;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

final class InstagramOutboundActions extends MetaOutboundActions
{
    protected function send(Conversation $conversation, array $payload): Response
    {
        /** @var Instagram $channel */
        $channel = $conversation->inbox->channel;

        return Http::post($channel->baseUri()."/{$channel->instagram_id}/messages", [
            ...$payload,
            'access_token' => $channel->access_token,
        ]);
    }
}
