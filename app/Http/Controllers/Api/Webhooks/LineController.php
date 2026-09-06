<?php

namespace App\Http\Controllers\Api\Webhooks;

use App\Http\Controllers\Controller;
use App\Jobs\Webhooks\LineEventsJob;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

// Port từ refs/chatwoot/app/controllers/webhooks/line_controller.rb — chữ ký
// x-line-signature được kiểm trong job (giữ nguyên bản gốc).
class LineController extends Controller
{
    public function processPayload(Request $request, string $lineChannelId): Response
    {
        LineEventsJob::dispatch(
            ['line_channel_id' => $lineChannelId, 'line' => $request->all()],
            (string) $request->header('x-line-signature'),
            $request->getContent(),
        );

        return response('', 200);
    }
}
