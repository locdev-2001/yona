<?php

namespace App\Http\Resources\Platform;

use App\Models\AgentBot;

final class PlatformAgentBotResource
{
    public static function toArray(AgentBot $agentBot): array
    {
        return [
            'id' => $agentBot->id,
            'name' => $agentBot->name,
            'description' => $agentBot->description,
            'outgoing_url' => $agentBot->outgoing_url,
            'account_id' => $agentBot->account_id,
            'access_token' => $agentBot->accessToken?->token,
        ];
    }
}
