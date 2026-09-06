<?php

namespace App\Http\Controllers\WebApi\Integrations;

use App\Http\Controllers\Controller;
use App\Http\Resources\IntegrationAppResource;
use App\Models\Account;
use App\Models\Integrations\Hook;
use App\Services\Integrations\Slack\ChannelBuilder;
use App\Services\Integrations\Slack\HookBuilder;
use App\Support\Integrations\App;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

// Port từ Api::V1::Accounts::Integrations::SlackController — resource số ít
// (một hook Slack cho mỗi account), toàn bộ thao tác chỉ administrator.
class SlackController extends Controller
{
    public function store(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $hook = (new HookBuilder(
            $account,
            (string) $request->input('code'),
            $request->input('inbox_id') !== null ? (int) $request->input('inbox_id') : null,
        ))->perform();

        return $this->appResponse($request, $account, $hook);
    }

    public function update(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);
        $hook = $this->fetchHook($account);

        $updatedHook = (new ChannelBuilder($hook))->update($request->input('reference_id'));

        if ($updatedHook === null) {
            return response()->json(['error' => __('errors.slack.invalid_channel_id')], 422);
        }

        return $this->appResponse($request, $account, $updatedHook);
    }

    public function destroy(Request $request, Account $account): Response
    {
        $this->authorizeAdministrator($request);
        $this->fetchHook($account)->delete();

        return response()->noContent(200);
    }

    public function listAllChannels(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);
        $hook = $this->fetchHook($account);

        $channels = collect((new ChannelBuilder($hook))->fetchChannels())
            ->map(fn (array $channel) => ['id' => $channel['id'], 'name' => $channel['name']])
            ->values();

        return response()->json($channels);
    }

    private function fetchHook(Account $account): Hook
    {
        $hook = $account->hooks()->where('app_id', 'slack')->first();

        abort_if($hook === null, 404);

        return $hook;
    }

    private function appResponse(Request $request, Account $account, Hook $hook): JsonResponse
    {
        $app = App::find($hook->app_id);
        abort_if($app === null, 500);

        return response()->json((new IntegrationAppResource($app, $account, administrator: true))->toArray($request));
    }
}
