<?php

namespace App\Http\Controllers\Api\Webhooks;

use App\Http\Controllers\Controller;
use App\Jobs\Webhooks\ZaloEventsJob;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Webhook từ bridge Zalo cá nhân. Xác thực bằng secret dùng chung
 * (VerifyZaloBridgeSecret), không session/CSRF như mọi webhook kênh ngoài.
 */
class ZaloController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $payload = $request->all();

        if ((int) ($payload['connection_id'] ?? 0) <= 0) {
            return response()->json(['ok' => false, 'message' => 'missing connection_id'], 400);
        }

        ZaloEventsJob::dispatch($payload);

        return response()->json(['ok' => true]);
    }
}
