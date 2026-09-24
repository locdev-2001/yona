<?php

namespace App\Http\Controllers\Api\Webhooks;

use App\Http\Controllers\Api\Webhooks\Concerns\VerifiesMetaSignature;
use App\Http\Controllers\Controller;
use App\Jobs\Webhooks\WhatsappEventsJob;
use App\Models\Channel\Whatsapp;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class WhatsappController extends Controller
{
    use VerifiesMetaSignature;

    public function verify(Request $request, string $phoneNumber): Response
    {
        $channel = Whatsapp::query()->where('phone_number', $phoneNumber)->first();

        return $this->verifyChallenge($request, [$channel?->provider_config['webhook_verify_token'] ?? null]);
    }

    public function processPayload(Request $request, string $phoneNumber): Response
    {
        $channel = Whatsapp::query()->where('phone_number', $phoneNumber)->first();

        if ($this->signatureRequired($channel) && ! $this->hasValidMetaSignature($request, $this->appSecrets($channel))) {
            return response('', 401);
        }

        WhatsappEventsJob::dispatch([...$request->all(), 'phone_number' => $phoneNumber]);

        return response('', 200);
    }

    // 360dialog không ký payload; chỉ Cloud API mới bắt buộc chữ ký.
    private function signatureRequired(?Whatsapp $channel): bool
    {
        return $channel === null || $channel->provider === 'whatsapp_cloud';
    }

    /** @return list<string|null> */
    private function appSecrets(?Whatsapp $channel): array
    {
        return [
            $channel?->provider_config['app_secret'] ?? null,
            config('services.whatsapp_cloud.app_secret'),
        ];
    }
}
