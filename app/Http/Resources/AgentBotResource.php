<?php

namespace App\Http\Resources;

use App\Models\Account;
use App\Models\AgentBot;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/models/_agent_bot.json.jbuilder + AgentBotPresenter:
// access_token chỉ lộ khi bot thuộc account đang đứng và người gọi là admin.
class AgentBotResource extends JsonResource
{
    public function __construct(
        AgentBot $resource,
        private readonly ?Account $account,
        private readonly bool $administrator,
    ) {
        parent::__construct($resource);
    }

    public function toArray(Request $request): array
    {
        /** @var AgentBot $agentBot */
        $agentBot = $this->resource;
        $systemBot = $agentBot->isSystemBot();
        $accessToken = $systemBot || $agentBot->account_id !== $this->account?->id
            ? null
            : $agentBot->accessToken?->token;

        return [
            'id' => $agentBot->id,
            'name' => $agentBot->name,
            'description' => $agentBot->description,
            'thumbnail' => $agentBot->avatarUrl(),
            ...($systemBot ? [] : ['outgoing_url' => $agentBot->outgoing_url]),
            'bot_type' => $agentBot->botTypeName(),
            'bot_config' => $agentBot->bot_config ?? [],
            'account_id' => $agentBot->account_id,
            ...(filled($accessToken) && $this->administrator ? ['access_token' => $accessToken] : []),
            ...(! $systemBot && $this->administrator ? ['secret' => $agentBot->secret] : []),
            'system_bot' => $systemBot,
        ];
    }

    // jbuilder api/v1/models/_agent_bot_slim — dùng khi gán bot cho hội thoại.
    public static function slim(AgentBot $agentBot): array
    {
        return [
            'id' => $agentBot->id,
            'name' => $agentBot->name,
            'description' => $agentBot->description,
            'thumbnail' => $agentBot->avatarUrl(),
            ...($agentBot->isSystemBot() ? [] : ['outgoing_url' => $agentBot->outgoing_url]),
            'bot_type' => $agentBot->botTypeName(),
        ];
    }

    /** @param iterable<AgentBot> $agentBots */
    public static function collectionFor(iterable $agentBots, ?Account $account, bool $administrator): array
    {
        return collect($agentBots)
            ->map(fn (AgentBot $agentBot) => (new self($agentBot, $account, $administrator))->toArray(request()))
            ->values()
            ->all();
    }
}
