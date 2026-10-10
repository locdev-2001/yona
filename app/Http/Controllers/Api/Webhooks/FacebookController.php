<?php

namespace App\Http\Controllers\Api\Webhooks;

use App\Http\Controllers\Api\Webhooks\Concerns\VerifiesMetaSignature;
use App\Http\Controllers\Controller;
use App\Jobs\Webhooks\FacebookEventsJob;
use App\Jobs\Webhooks\FacebookReceiptsJob;
use App\Services\Facebook\ReceiptRecorder;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Endpoint `/bot` của Messenger: GET xác nhận verify token, POST bung từng
 * phần tử `messaging`/`standby` thành một job (tin nhắn hoặc biên nhận).
 */
class FacebookController extends Controller
{
    use VerifiesMetaSignature;

    public function verify(Request $request): Response
    {
        return $this->verifyChallenge($request, [config('services.facebook.verify_token')]);
    }

    public function events(Request $request): Response
    {
        if (! $this->hasValidMetaSignature($request, $this->appSecrets($request))) {
            return response('', 401);
        }

        foreach ((array) $request->input('entry', []) as $entry) {
            foreach ([...$entry['messaging'] ?? [], ...$entry['standby'] ?? []] as $messaging) {
                if (ReceiptRecorder::handles($messaging)) {
                    FacebookReceiptsJob::dispatch($messaging);

                    continue;
                }

                if (blank($messaging['message'] ?? null)) {
                    continue;
                }

                $job = FacebookEventsJob::dispatch($messaging);

                if (filled(data_get($messaging, 'message.is_echo'))) {
                    $job->delay(now()->addSeconds(2));
                }
            }
        }

        return response('', 200);
    }

    /** @return list<string|null> */
    private function appSecrets(Request $request): array
    {
        return [config('services.facebook.app_secret')];
    }
}
