<?php

namespace App\Http\Controllers\Api\Webhooks;

use App\Http\Controllers\Controller;
use App\Jobs\Webhooks\MessengerPersonalEventsJob;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Webhook từ sidecar Messenger cá nhân. Xác thực bằng secret dùng chung
 * (VerifyMessengerBridgeSecret); chỉ nhận rồi đẩy vào hàng đợi, xử lý nằm ở service.
 * Trả 2xx = sidecar xoá sự kiện khỏi outbox.
 */
class MessengerPersonalController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $payload = $request->all();

        if ((int) ($payload['connection_id'] ?? 0) <= 0 || blank($payload['type'] ?? null)) {
            return response()->json(['ok' => false, 'message' => 'missing connection_id or type'], 400);
        }

        MessengerPersonalEventsJob::dispatch($payload);

        return response()->json(['ok' => true]);
    }
}
