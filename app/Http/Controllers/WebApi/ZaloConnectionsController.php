<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Channel\Zalo;
use App\Models\Inbox;
use App\Services\Zalo\QrLoginService;
use App\Services\Zalo\ZaloHealthMonitor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Vòng đời đăng nhập QR của kênh Zalo cá nhân. Port từ ZaloConnectionController
 * của nhánh `main`; khác biệt: phiên QR gắn thẳng vào bản ghi kênh (mỗi inbox
 * đúng một tài khoản Zalo) thay vì slot rời trong session.
 */
class ZaloConnectionsController extends Controller
{
    public function __construct(
        private readonly QrLoginService $qrLogin,
        private readonly ZaloHealthMonitor $healthMonitor,
    ) {}

    public function startQr(Request $request, Account $account, int $inboxId): JsonResponse
    {
        $channel = $this->fetchChannel($request, $account, $inboxId);
        $result = $this->qrLogin->start($channel);

        return response()->json($result, $result['ok'] ? 200 : 503);
    }

    public function qrStatus(Request $request, Account $account, int $inboxId): JsonResponse
    {
        $channel = $this->fetchChannel($request, $account, $inboxId);
        $result = $this->qrLogin->status($channel);

        return response()->json($result, $result['ok'] ? 200 : 503);
    }

    public function promote(Request $request, Account $account, int $inboxId): JsonResponse
    {
        $channel = $this->fetchChannel($request, $account, $inboxId);
        $result = $this->qrLogin->promote($channel);

        return response()->json($result, $result['ok'] ? 200 : ($result['status'] ?? 503));
    }

    public function health(Request $request, Account $account, int $inboxId): JsonResponse
    {
        $channel = $this->fetchChannel($request, $account, $inboxId);

        return response()->json([
            'state' => $channel->state,
            'zalo_uid' => $channel->zalo_uid,
            'display_name' => $channel->display_name,
            'phone' => $channel->phone,
            'session_lost_reason' => $channel->session_lost_reason,
            'last_connected_at' => $channel->last_connected_at?->toIso8601String(),
            'last_session_lost_at' => $channel->last_session_lost_at?->toIso8601String(),
            'circuit_open' => $this->healthMonitor->isCircuitOpen($channel->connectionId()),
            'error_count' => $this->healthMonitor->errorCount($channel->connectionId()),
        ]);
    }

    // Cùng luật với InboxesController: ngoài account → 404, không phải quản trị → 401.
    private function fetchChannel(Request $request, Account $account, int $inboxId): Zalo
    {
        /** @var AccountUser $accountUser */
        $accountUser = $request->attributes->get('currentAccountUser');

        abort_unless($accountUser->isAdministrator(), 401, 'You are not authorized to do this action');

        /** @var Inbox $inbox */
        $inbox = $account->inboxes()->where('channel_type', 'Channel::Zalo')->findOrFail($inboxId);

        return $inbox->channel;
    }
}
