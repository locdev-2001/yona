<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\AgentBotResource;
use App\Jobs\Avatar\AvatarFromUrlJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\AgentBot;
use App\Support\RecordInvalidResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Validator;

// Port từ Api::V1::Accounts::AgentBotsController + AgentBotPolicy
// (index/show cho cả agent, mọi thao tác ghi chỉ administrator).
class AgentBotsController extends Controller
{
    public function index(Request $request, Account $account): JsonResponse
    {
        $agentBots = AgentBot::query()->accessibleTo($account)->orderBy('id')->get();

        return response()->json(AgentBotResource::collectionFor($agentBots, $account, $this->isAdministrator($request)));
    }

    public function show(Request $request, Account $account, int $agentBotId): JsonResponse
    {
        $agentBot = AgentBot::query()->accessibleTo($account)->whereKey($agentBotId)->firstOrFail();

        return response()->json($this->resource($request, $account, $agentBot));
    }

    public function store(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);
        $agentBot = $account->agentBots()->create($this->validatedPayload($request, true));
        $this->processAvatarFromUrl($request, $agentBot);

        return response()->json($this->resource($request, $account, $agentBot));
    }

    public function update(Request $request, Account $account, int $agentBotId): JsonResponse
    {
        $this->authorizeAdministrator($request);
        $agentBot = $this->fetchOwnedAgentBot($account, $agentBotId);
        $agentBot->update($this->validatedPayload($request, false));
        $this->processAvatarFromUrl($request, $agentBot);

        return response()->json($this->resource($request, $account, $agentBot->refresh()));
    }

    public function destroy(Request $request, Account $account, int $agentBotId): Response
    {
        $this->authorizeAdministrator($request);
        $this->fetchOwnedAgentBot($account, $agentBotId)->delete();

        return response()->noContent(200);
    }

    public function destroyAvatar(Request $request, Account $account, int $agentBotId): JsonResponse
    {
        $this->authorizeAdministrator($request);
        $agentBot = $this->fetchOwnedAgentBot($account, $agentBotId);
        $agentBot->avatar?->delete();
        $agentBot->unsetRelation('avatar');

        return response()->json($this->resource($request, $account, $agentBot));
    }

    public function resetAccessToken(Request $request, Account $account, int $agentBotId): JsonResponse
    {
        $this->authorizeAdministrator($request);
        $agentBot = $this->fetchOwnedAgentBot($account, $agentBotId);
        $accessToken = $agentBot->accessToken ?? $agentBot->accessToken()->create([]);
        $accessToken->update(['token' => AgentBot::generateSecret()]);
        $agentBot->unsetRelation('accessToken');

        return response()->json($this->resource($request, $account, $agentBot));
    }

    public function resetSecret(Request $request, Account $account, int $agentBotId): JsonResponse
    {
        $this->authorizeAdministrator($request);
        $agentBot = $this->fetchOwnedAgentBot($account, $agentBotId);
        $agentBot->resetSecret();

        return response()->json($this->resource($request, $account, $agentBot));
    }

    /** @return array<string, mixed> */
    private function validatedPayload(Request $request, bool $creating): array
    {
        $required = $creating ? 'required' : 'sometimes';

        return RecordInvalidResponse::validatedOrAbort(Validator::make(
            collect($request->all())->only(['name', 'description', 'outgoing_url', 'bot_config'])->all(),
            [
                'name' => ['bail', $required, 'filled', 'string'],
                'description' => ['sometimes', 'nullable', 'string'],
                'outgoing_url' => ['sometimes', 'nullable', 'string', 'max:'.AgentBot::URL_LENGTH_LIMIT],
                'bot_config' => ['sometimes', 'nullable', 'array'],
            ],
            [
                'name.required' => "Name can't be blank",
                'name.filled' => "Name can't be blank",
                'outgoing_url.max' => 'Outgoing url is too long (maximum is '.AgentBot::URL_LENGTH_LIMIT.' characters)',
            ],
        ));
    }

    private function processAvatarFromUrl(Request $request, AgentBot $agentBot): void
    {
        $avatarUrl = $request->input('avatar_url');

        if (filled($avatarUrl)) {
            AvatarFromUrlJob::dispatch($agentBot, $avatarUrl);
        }
    }

    // Chỉ bot thuộc account mới sửa được; system bot là chỉ đọc.
    private function fetchOwnedAgentBot(Account $account, int $agentBotId): AgentBot
    {
        return $account->agentBots()->whereKey($agentBotId)->firstOrFail();
    }

    private function resource(Request $request, Account $account, AgentBot $agentBot): array
    {
        return (new AgentBotResource($agentBot, $account, $this->isAdministrator($request)))->toArray($request);
    }

    private function isAdministrator(Request $request): bool
    {
        $accountUser = $request->attributes->get('currentAccountUser');

        return $accountUser instanceof AccountUser && $accountUser->isAdministrator();
    }
}
