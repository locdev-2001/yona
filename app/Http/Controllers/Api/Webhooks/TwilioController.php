<?php

namespace App\Http\Controllers\Api\Webhooks;

use App\Http\Controllers\Controller;
use App\Jobs\Webhooks\TwilioDeliveryStatusJob;
use App\Jobs\Webhooks\TwilioEventsJob;
use App\Models\Channel\TwilioSms;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Port từ refs/chatwoot/app/controllers/twilio/callback_controller.rb +
 * delivery_status_controller.rb. Chữ ký X-Twilio-Signature được kiểm tại đây
 * (bản gốc dựa vào middleware của gem twilio-ruby).
 */
class TwilioController extends Controller
{
    public function processPayload(Request $request): Response
    {
        if (! $this->hasValidSignature($request)) {
            return response('', 401);
        }

        TwilioEventsJob::dispatch($request->all());

        return response('', 200);
    }

    public function deliveryStatus(Request $request): Response
    {
        if (! $this->hasValidSignature($request)) {
            return response('', 401);
        }

        TwilioDeliveryStatusJob::dispatch($request->all());

        return response('', 200);
    }

    // https://www.twilio.com/docs/usage/security#validating-requests
    private function hasValidSignature(Request $request): bool
    {
        $signature = $request->header('X-Twilio-Signature');

        if (blank($signature)) {
            return false;
        }

        $channel = $this->resolveChannel($request);

        if ($channel === null) {
            return false;
        }

        $params = $request->all();
        ksort($params);

        $payload = $request->fullUrl();

        foreach ($params as $key => $value) {
            $payload .= $key.(is_scalar($value) ? (string) $value : json_encode($value));
        }

        $expected = base64_encode(hash_hmac('sha1', $payload, $channel->auth_token, true));

        return hash_equals($expected, $signature);
    }

    private function resolveChannel(Request $request): ?TwilioSms
    {
        if (filled($request->input('MessagingServiceSid'))) {
            $channel = TwilioSms::query()->where('messaging_service_sid', $request->input('MessagingServiceSid'))->first();

            if ($channel !== null) {
                return $channel;
            }
        }

        return TwilioSms::query()
            ->where('account_sid', $request->input('AccountSid'))
            ->where('phone_number', $request->input('To'))
            ->first();
    }
}
