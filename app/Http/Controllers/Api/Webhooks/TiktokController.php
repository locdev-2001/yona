<?php

namespace App\Http\Controllers\Api\Webhooks;

use App\Http\Controllers\Controller;
use App\Jobs\Webhooks\TiktokEventsJob;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class TiktokController extends Controller
{
    private const MAX_SIGNATURE_DELAY_SECONDS = 5;

    public function events(Request $request): Response
    {
        if (! $this->hasValidSignature($request)) {
            return response('', 401);
        }

        $event = (array) $request->json()->all();
        $job = TiktokEventsJob::dispatch($event);

        if (($event['event'] ?? null) === 'im_send_msg') {
            $job->delay(now()->addSeconds(2));
        }

        return response('', 200);
    }

    // Header dạng `t=<epoch>,s=<hex hmac của "<t>.<raw body>">`.
    private function hasValidSignature(Request $request): bool
    {
        $secret = config('services.tiktok.app_secret');
        $header = (string) $request->header('Tiktok-Signature');

        if (blank($secret) || blank($header)) {
            return false;
        }

        $parts = [];

        foreach (explode(',', $header) as $piece) {
            [$key, $value] = array_pad(explode('=', $piece, 2), 2, null);
            $parts[$key] = $value;
        }

        $timestamp = isset($parts['t']) ? (int) $parts['t'] : null;
        $signature = $parts['s'] ?? null;

        if ($timestamp === null || blank($signature)) {
            return false;
        }

        $expected = hash_hmac('sha256', $timestamp.'.'.$request->getContent(), $secret);

        if (! hash_equals($expected, $signature)) {
            return false;
        }

        return (time() - $timestamp) <= self::MAX_SIGNATURE_DELAY_SECONDS;
    }
}
