<?php

namespace App\Http\RateLimiting;

use App\Http\Middleware\AuthenticateApiAccessToken;
use App\Http\RequestSigning\Subjects\DashboardSigningSubject;
use App\Http\RequestSigning\Subjects\WidgetSigningSubject;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;

// Giới hạn nhịp chống lạm dụng API nhắn tin, khoá theo người gọi + account, không theo IP
// (IP sau CDN từng gộp nhiều khách làm một). Luật tin chủ động của kênh là chuyện khác, nằm ở lõi.
final class MessagingRateLimiters
{
    public const DASHBOARD_READS = 'dashboard-message-reads';

    public const DASHBOARD_WRITES = 'dashboard-message-writes';

    public const WIDGET_READS = 'widget-message-reads';

    public const WIDGET_WRITES = 'widget-message-writes';

    public const PLATFORM_API = 'platform-api';

    public static function register(): void
    {
        foreach (['reads' => self::DASHBOARD_READS, 'writes' => self::DASHBOARD_WRITES] as $kind => $name) {
            RateLimiter::for($name, fn (Request $request) => self::dashboardLimit($request, $name, $kind));
        }

        RateLimiter::for(self::WIDGET_READS, fn (Request $request) => self::limit(
            self::WIDGET_READS,
            (int) config('request_protection.throttle.widget.reads'),
            self::widgetCaller($request),
        ));

        RateLimiter::for(self::WIDGET_WRITES, fn (Request $request) => [
            self::limit(self::WIDGET_WRITES, (int) config('request_protection.throttle.widget.writes'), self::widgetCaller($request)),
            self::limit(
                self::WIDGET_WRITES,
                (int) config('request_protection.throttle.widget.writes_per_inbox'),
                'inbox:'.app(WidgetSigningSubject::class)->inboxId($request),
            ),
        ]);

        RateLimiter::for(self::PLATFORM_API, fn (Request $request) => self::limit(
            self::PLATFORM_API,
            (int) config('request_protection.throttle.platform_api.requests'),
            // Throttle bị framework xếp chạy trước middleware xác thực: khoá theo băm của token.
            'token:'.hash('sha256', (string) $request->header('api_access_token')),
        ));
    }

    private static function dashboardLimit(Request $request, string $name, string $kind): Limit
    {
        $profile = $request->attributes->get(AuthenticateApiAccessToken::AUTHENTICATED_BY_TOKEN) ? 'application_api' : 'dashboard';
        $caller = app(DashboardSigningSubject::class)->identify($request);

        return self::limit(
            $name,
            (int) config("request_protection.throttle.{$profile}.{$kind}"),
            "{$profile}:account:{$request->route('account')}:{$caller}",
        );
    }

    private static function widgetCaller(Request $request): string
    {
        return (string) app(WidgetSigningSubject::class)->identify($request);
    }

    private static function limit(string $name, int $perMinute, string $key): Limit
    {
        return Limit::perMinute($perMinute)
            ->by($name.':'.$key)
            ->response(function (Request $request, array $headers) use ($name, $key) {
                Log::warning('request_throttled', [
                    'limiter' => $name,
                    'key' => $key,
                    'method' => $request->getRealMethod(),
                    'path' => $request->path(),
                ]);

                return response()->json([
                    'error' => 'too_many_requests',
                    'retry_after' => (int) ($headers['Retry-After'] ?? 60),
                ], 429, $headers);
            });
    }
}
