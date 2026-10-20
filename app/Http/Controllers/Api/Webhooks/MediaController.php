<?php

namespace App\Http\Controllers\Api\Webhooks;

use App\Http\Controllers\Controller;
use App\Services\Calls\CallPresenceRecorder;
use App\Services\Calls\Media\InvalidMediaWebhook;
use App\Services\Calls\Media\MediaDrivers;
use App\Services\Calls\Media\WebhookDelivery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

// Webhook của nhà cung cấp phòng media. `{provider}` chọn driver trong sổ; driver tự kiểm
// chữ ký và dịch sự kiện, lõi ghi vào/ra phòng.
class MediaController extends Controller
{
    public function __construct(
        private readonly MediaDrivers $drivers,
        private readonly CallPresenceRecorder $recorder,
    ) {}

    public function __invoke(Request $request, string $provider): JsonResponse
    {
        abort_unless($this->drivers->has($provider), 404);

        $delivery = new WebhookDelivery(
            $request->getContent(),
            collect($request->headers->all())->map(fn (array $values) => (string) ($values[0] ?? ''))->all(),
        );

        try {
            $event = $this->drivers->named($provider)->webhooks()->parse($delivery);
        } catch (InvalidMediaWebhook $exception) {
            Log::warning('Rejected media webhook', ['provider' => $provider, 'reason' => $exception->getMessage()]);

            return response()->json(['ok' => false], 401);
        }

        if ($event !== null) {
            $this->recorder->record($event);
        }

        return response()->json(['ok' => true]);
    }
}
