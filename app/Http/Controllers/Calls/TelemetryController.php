<?php

namespace App\Http\Controllers\Calls;

use App\Http\Controllers\Controller;
use App\Models\Call;
use App\Services\Calls\Telemetry\CallTelemetry;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class TelemetryController extends Controller
{
    public function __invoke(Request $request, Call $call, CallTelemetry $telemetry): Response
    {
        abort_if(strlen($request->getContent()) > 65536, 413);
        $telemetry->record($call, $request->user(), $request->all());

        return response()->noContent();
    }
}
