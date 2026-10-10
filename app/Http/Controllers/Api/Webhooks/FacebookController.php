<?php

namespace App\Http\Controllers\Api\Webhooks;

use App\Http\Controllers\Api\Webhooks\Concerns\VerifiesMetaSignature;
use App\Http\Controllers\Controller;
use App\Jobs\Webhooks\FacebookEventsJob;
use App\Jobs\Webhooks\FacebookMessageEventsJob;
use App\Services\Facebook\MessageParser;
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
                $payload = new MessageParser($messaging);

                if ($payload->hasEvents()) {
                    FacebookMessageEventsJob::dispatch($messaging);
                }

                if (! $payload->hasMessage()) {
                    continue;
                }

                $job = FacebookEventsJob::dispatch($messaging);

                // Echo tới trước khi Graph kịp trả message_id cho tin vừa gửi → hoãn một nhịp.
                if ($payload->isEcho()) {
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
