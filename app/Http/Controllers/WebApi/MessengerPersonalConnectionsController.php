<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Channel\MessengerPersonal;
use App\Models\Inbox;
use App\Services\MessengerPersonal\BridgeClient;
use App\Services\MessengerPersonal\HealthMonitor;
use App\Services\MessengerPersonal\LoginService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Vòng đời đăng nhập của kênh Messenger cá nhân. Thân `login/submit` có thể chứa mật
 * khẩu: chỉ đi xuyên qua LoginService tới sidecar, không ghi log, không lưu.
 */
class MessengerPersonalConnectionsController extends Controller
{
    private const MAX_INPUT_FIELDS = 10;

    private const MAX_INPUT_LENGTH = 512;

    public function __construct(
        private readonly LoginService $login,
        private readonly HealthMonitor $monitor,
        private readonly BridgeClient $bridge,
    ) {}

    public function start(Request $request, Account $account, int $inboxId): JsonResponse
    {
        return $this->respond($this->login->start($this->fetchChannel($request, $account, $inboxId)));
    }

    public function submit(Request $request, Account $account, int $inboxId): JsonResponse
    {
        $channel = $this->fetchChannel($request, $account, $inboxId);

        return $this->respond($this->login->submit($channel, $this->rawInput($request)));
    }

    /**
     * Đọc thẳng thân request: middleware TrimStrings toàn cục cắt khoảng trắng hai đầu của
     * mọi chuỗi (chỉ chừa khoá tên `password`), mà mật khẩu nằm dưới id ô do sidecar đặt —
     * cắt là đổi mật khẩu của người dùng.
     *
     * @return array<string, string>
     */
    private function rawInput(Request $request): array
    {
        $body = json_decode((string) $request->getContent(), true);
        $input = is_array($body) ? ($body['input'] ?? null) : null;

        $valid = is_array($input)
            && count($input) <= self::MAX_INPUT_FIELDS
            && collect($input)->every(fn ($value, $key) => is_string($key)
                && ($value === null || (is_string($value) && mb_strlen($value) <= self::MAX_INPUT_LENGTH)));

        if (! $valid) {
            throw ValidationException::withMessages(['input' => __('validation.array', ['attribute' => 'input'])]);
        }

        return array_map(fn (?string $value) => (string) $value, $input);
    }

    public function cancel(Request $request, Account $account, int $inboxId): JsonResponse
    {
        return $this->respond($this->login->cancel($this->fetchChannel($request, $account, $inboxId)));
    }

    public function disconnect(Request $request, Account $account, int $inboxId): JsonResponse
    {
        return $this->respond($this->login->disconnect($this->fetchChannel($request, $account, $inboxId)));
    }

    public function health(Request $request, Account $account, int $inboxId): JsonResponse
    {
        $channel = $this->fetchChannel($request, $account, $inboxId);
        $live = $channel->isConnected() ? $this->bridge->health($channel) : null;

        return response()->json([
            'state' => $channel->state,
            'facebook_user_id' => $channel->facebook_user_id,
            'display_name' => $channel->display_name,
            'session_lost_reason' => $channel->session_lost_reason,
            'last_connected_at' => $channel->last_connected_at?->toIso8601String(),
            'last_session_lost_at' => $channel->last_session_lost_at?->toIso8601String(),
            'reauthorization_required' => $channel->reauthorizationRequired(),
            'bridge' => [
                ...$this->monitor->status($channel->connectionId()),
                'reachable' => $live !== null,
                'regular_connected' => $live?->json('regular_connected'),
                'e2ee_connected' => $live?->json('e2ee_connected'),
            ],
        ]);
    }

    /** @param array<string, mixed> $result */
    private function respond(array $result): JsonResponse
    {
        $status = ($result['ok'] ?? false) ? 200 : (int) ($result['status'] ?? 503);

        return response()->json($result, $status);
    }

    // Cùng luật với InboxesController: ngoài account → 404, không phải quản trị → 401.
    private function fetchChannel(Request $request, Account $account, int $inboxId): MessengerPersonal
    {
        /** @var AccountUser $accountUser */
        $accountUser = $request->attributes->get('currentAccountUser');

        abort_unless($accountUser->isAdministrator(), 401, 'You are not authorized to do this action');

        /** @var Inbox $inbox */
        $inbox = $account->inboxes()->where('channel_type', 'Channel::MessengerPersonal')->findOrFail($inboxId);

        return $inbox->channel;
    }
}
