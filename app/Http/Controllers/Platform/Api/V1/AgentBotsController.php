<?php

namespace App\Http\Controllers\Platform\Api\V1;

use App\Http\Resources\Platform\PlatformAgentBotResource;
use App\Jobs\Avatar\AvatarFromUrlJob;
use App\Models\AgentBot;
use App\Models\PlatformAppPermissible;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AgentBotsController extends PlatformController
{
    public function index(Request $request): JsonResponse
    {
        $bots = $this->platformApp($request)->platformAppPermissibles()
            ->where('permissible_type', 'AgentBot')
            ->with('permissible')
            ->get()
            ->map(fn (PlatformAppPermissible $permissible) => $permissible->permissible)
            ->filter()
            ->map(fn (AgentBot $agentBot) => PlatformAgentBotResource::toArray($agentBot))
            ->values();

        return response()->json($bots);
    }

    public function show(Request $request, AgentBot $agentBot): JsonResponse
    {
        return $this->denyUnlessPermissible($request, $agentBot)
            ?? response()->json(PlatformAgentBotResource::toArray($agentBot));
    }

    public function store(Request $request): JsonResponse
    {
        $agentBot = AgentBot::create($request->only(['name', 'description', 'account_id', 'outgoing_url']));
        $this->processAvatarFromUrl($agentBot, $request);
        $this->platformApp($request)->permit($agentBot);

        return response()->json(PlatformAgentBotResource::toArray($agentBot->fresh()));
    }

    public function update(Request $request, AgentBot $agentBot): JsonResponse
    {
        if ($denied = $this->denyUnlessPermissible($request, $agentBot)) {
            return $denied;
        }

        $agentBot->update($request->only(['name', 'description', 'account_id', 'outgoing_url']));
        $this->processAvatarFromUrl($agentBot, $request);

        return response()->json(PlatformAgentBotResource::toArray($agentBot->fresh()));
    }

    public function destroy(Request $request, AgentBot $agentBot): JsonResponse
    {
        if ($denied = $this->denyUnlessPermissible($request, $agentBot)) {
            return $denied;
        }

        $agentBot->delete();

        return response()->json([]);
    }

    public function destroyAvatar(Request $request, AgentBot $agentBot): JsonResponse
    {
        if ($denied = $this->denyUnlessPermissible($request, $agentBot)) {
            return $denied;
        }

        $agentBot->removeAvatar();

        return response()->json(PlatformAgentBotResource::toArray($agentBot->fresh()));
    }

    private function processAvatarFromUrl(AgentBot $agentBot, Request $request): void
    {
        if ($request->filled('avatar_url')) {
            AvatarFromUrlJob::dispatch($agentBot, $request->input('avatar_url'));
        }
    }
}
