<?php

namespace App\Http\Controllers\Api\Webhooks;

use App\Http\Controllers\Api\Webhooks\Concerns\VerifiesMetaSignature;
use App\Http\Controllers\Controller;
use App\Jobs\Webhooks\InstagramEventsJob;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class InstagramController extends Controller
{
    use VerifiesMetaSignature;

    public function verify(Request $request): Response
    {
        return $this->verifyChallenge($request, [
            config('services.instagram.ig_verify_token'),
            config('services.instagram.verify_token'),
        ]);
    }

    public function events(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        if (! $this->hasValidMetaSignature($request, [
            config('services.instagram.app_secret'),
            config('services.facebook.app_secret'),
        ])) {
            return response('', 401);
        }

        if (strcasecmp((string) $request->input('object'), 'instagram') !== 0) {
            return response('', 422);
        }

        $entries = (array) $request->input('entry', []);
        $job = InstagramEventsJob::dispatch($entries);

        // Echo tới trước khi API gửi tin kịp trả về → hoãn 2 giây như bản gốc.
        if ($this->containsEchoEvent($entries)) {
            $job->delay(now()->addSeconds(2));
        }

        return response()->json('ok');
    }

    /** @param list<array<string, mixed>> $entries */
    private function containsEchoEvent(array $entries): bool
    {
        foreach ($entries as $entry) {
            foreach ($entry['messaging'] ?? [] as $messaging) {
                if (filled(data_get($messaging, 'message.is_echo'))) {
                    return true;
                }
            }
        }

        return false;
    }
}
