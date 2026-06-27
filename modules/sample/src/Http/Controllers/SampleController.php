<?php

namespace Modules\Sample\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

class SampleController
{
    public function index(): Response
    {
        return Inertia::render('Modules.Sample.sample/index', [
            'message' => 'sample module loaded',
        ]);
    }

    public function ping(): JsonResponse
    {
        return response()->json(['status' => 'ok', 'module' => 'sample']);
    }
}
