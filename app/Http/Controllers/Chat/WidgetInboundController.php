<?php

namespace App\Http\Controllers\Chat;

use App\Http\Controllers\Controller;
use App\Modules\Chat\Adapter\Widget\WidgetChannelDriver;
use App\Modules\Integration\ChannelManager;
use App\Services\InboundMessageService;
use App\Support\TenantScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Đường vào của kênh nội bộ.
 *
 * Đi qua ĐÚNG một điểm nhập với webhook Zalo: driver dịch payload rồi
 * `InboundMessageService::ingest` lo phần còn lại. Viết đường ingest riêng "cho
 * nhanh" là tạo ra hai đường sẽ lệch dần khỏi nhau — khử trùng, đếm, broadcast
 * đều phải nhân đôi.
 *
 * Không có phiên đăng nhập: xác thực bằng secret ở middleware, và ngữ cảnh
 * workspace suy ra từ tài khoản kênh chứ KHÔNG nhận từ client.
 */
class WidgetInboundController extends Controller
{
    public function __invoke(
        Request $request,
        ChannelManager $channels,
        InboundMessageService $inbound,
    ): JsonResponse {
        $validated = $request->validate([
            'channel_account_id' => ['required', 'uuid'],
            'visitor_id' => ['required', 'string', 'max:128'],
            'body' => ['nullable', 'string', 'max:4096'],
            'events' => ['nullable', 'array'],
            'source_id' => ['nullable', 'string', 'max:128'],
        ]);

        // Chưa biết workspace nên chưa có ngữ cảnh RLS ⇒ tra bằng connection
        // privileged, đúng khuôn webhook Zalo. Workspace suy ra TỪ tài khoản
        // kênh — client không bao giờ được quyết định nó.
        $account = DB::connection('pgsql_privileged')
            ->table('channel_accounts')
            ->where('id', $validated['channel_account_id'])
            ->where('channel', WidgetChannelDriver::KEY)
            ->first(['id', 'workspace_id']);

        if ($account === null) {
            return response()->json(['error_code' => 'channel_account_not_found'], 404);
        }

        $message = TenantScope::runScoped($account->workspace_id, function () use ($channels, $inbound, $validated, $account) {
            $normalized = $channels->driver(WidgetChannelDriver::KEY)->parseInbound([
                ...$validated,
                'channel_account_id' => $account->id,
            ]);

            return $inbound->ingest($normalized);
        });

        return response()->json(['ok' => true, 'message_id' => $message->id], 201);
    }
}
