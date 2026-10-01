<?php

namespace App\Http\Middleware;

use App\Models\Channel\WebWidget;
use App\Services\ProductEvents\ProductEventHooks;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Widget đã gắn lên website của khách: lần đầu trang widget được mở từ một tên
 * miền khác Yona (xem trước ở màn cấu hình không tính). Ghi sự kiện
 * `channel_connected` (method widget_embed) một lần cho mỗi hộp thư; các lượt tải
 * sau chỉ hỏi cache, không chạm DB. Không bao giờ làm hỏng trang widget.
 */
class RecordWidgetInstall
{
    private const SEEN_CACHE_SECONDS = 60 * 60 * 24 * 30;

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        try {
            $this->record($request);
        } catch (Throwable $exception) {
            report($exception);
        }

        return $response;
    }

    private function record(Request $request): void
    {
        $websiteToken = $request->query('website_token');
        $refererHost = parse_url((string) $request->headers->get('referer'), PHP_URL_HOST);

        if (! is_string($websiteToken) || $websiteToken === '' || $request->boolean('preview')
            || ! is_string($refererHost) || $this->isOwnHost($request, $refererHost)) {
            return;
        }

        if (! Cache::add('product_events:widget_seen:'.hash('sha256', $websiteToken), true, self::SEEN_CACHE_SECONDS)) {
            return;
        }

        $inbox = WebWidget::query()->where('website_token', $websiteToken)->first()?->inbox;
        if ($inbox !== null) {
            app(ProductEventHooks::class)->channelConnected($inbox, 'widget_embed');
        }
    }

    private function isOwnHost(Request $request, string $host): bool
    {
        $host = mb_strtolower($host);

        return $host === mb_strtolower($request->getHost())
            || $host === mb_strtolower((string) parse_url((string) config('app.url'), PHP_URL_HOST))
            || in_array($host, ['localhost', '127.0.0.1'], true);
    }
}
