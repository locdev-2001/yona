<?php

namespace App\Http\Controllers\Api\Integrations;

use App\Services\Integrations\Slack\IncomingMessageBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Port từ Api::V1::Integrations::WebhooksController — cổng Slack gọi vào
// (Event Subscriptions), KHÔNG auth. Chỉ Slack dùng route này ở bản gốc.
class WebhooksController
{
    public function store(Request $request): JsonResponse
    {
        $response = (new IncomingMessageBuilder($request->all()))->perform();

        return response()->json($response);
    }
}
