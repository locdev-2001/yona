<?php

namespace App\Http\Controllers\Api\Webhooks;

use App\Http\Controllers\Api\Webhooks\Concerns\VerifiesMetaSignature;
use App\Http\Controllers\Controller;
use App\Jobs\Webhooks\FacebookEventsJob;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Port của endpoint `/bot` mà Chatwoot mount từ gem facebook-messenger
 * (`Facebook::Messenger::Server`): GET xác nhận verify token, POST bung từng
 * phần tử `messaging`/`standby` thành một job như các handler `Bot.on` của gem.
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
                // delivery/read chưa port (chỉ cập nhật watermark) — bỏ qua như bản gốc bỏ vào job khác.
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
