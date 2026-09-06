<?php

namespace App\Http\Controllers\Api\Webhooks;

use App\Http\Controllers\Controller;
use App\Jobs\Webhooks\SmsEventsJob;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

// Port từ refs/chatwoot/app/controllers/webhooks/sms_controller.rb — Bandwidth
// gửi một mảng JSON ở gốc payload (`params['_json']` của Rails).
class SmsController extends Controller
{
    public function processPayload(Request $request): Response
    {
        $payload = $request->json()->all();
        $event = array_is_list($payload) ? ($payload[0] ?? null) : $payload;

        if (filled($event)) {
            SmsEventsJob::dispatch((array) $event);
        }

        return response('', 200);
    }
}
