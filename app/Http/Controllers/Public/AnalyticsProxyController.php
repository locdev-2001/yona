<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Services\Analytics\PlausibleProxy;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

// Script và sự kiện analytics đi qua chính domain của app (first-party).
class AnalyticsProxyController extends Controller
{
    private const SCRIPT_BROWSER_CACHE_SECONDS = 3600;

    // Upstream chết thì mỗi pageview sẽ ghi một dòng log; chỉ ghi một lần mỗi 5 phút.
    private const UPSTREAM_DOWN_LOG_KEY = 'analytics-proxy-upstream-log';

    private const UPSTREAM_DOWN_LOG_DECAY_SECONDS = 300;

    public function __construct(private readonly PlausibleProxy $analytics) {}

    public function script(): Response
    {
        abort_unless($this->analytics->enabled(), Response::HTTP_NOT_FOUND);

        $script = $this->analytics->script();

        if ($script === null) {
            return response('', Response::HTTP_SERVICE_UNAVAILABLE, ['Cache-Control' => 'no-store']);
        }

        return response($script, Response::HTTP_OK, [
            'Content-Type' => 'application/javascript; charset=utf-8',
            'Cache-Control' => 'public, max-age='.self::SCRIPT_BROWSER_CACHE_SECONDS,
        ]);
    }

    public function event(Request $request): Response
    {
        abort_unless($this->analytics->enabled(), Response::HTTP_NOT_FOUND);

        if (strlen($request->getContent()) > PlausibleProxy::EVENT_BODY_MAX_BYTES) {
            return response('', Response::HTTP_REQUEST_ENTITY_TOO_LARGE, ['Cache-Control' => 'no-store']);
        }

        try {
            $upstream = $this->analytics->forwardEvent($request);
        } catch (ConnectionException $exception) {
            RateLimiter::attempt(
                self::UPSTREAM_DOWN_LOG_KEY,
                1,
                fn () => Log::warning('Không gửi được sự kiện analytics tới máy chủ analytics', ['error' => $exception->getMessage()]),
                self::UPSTREAM_DOWN_LOG_DECAY_SECONDS,
            );

            return response('', Response::HTTP_BAD_GATEWAY, ['Cache-Control' => 'no-store']);
        }

        $headers = array_filter([
            'Cache-Control' => 'no-store',
            'Content-Type' => $upstream->header('Content-Type') ?: null,
            PlausibleProxy::DROPPED_HEADER => $upstream->header(PlausibleProxy::DROPPED_HEADER) ?: null,
        ], fn (?string $value) => $value !== null);

        return response($upstream->body(), $upstream->status(), $headers);
    }
}
