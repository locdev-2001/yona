<?php

namespace App\Http\Middleware;

use App\Models\Channel\WebWidget;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Trang widget chỉ được nhúng trên các tên miền hộp thư website cho phép. Trình
 * duyệt chặn iframe nằm ngoài danh sách trước khi app widget chạy, nên không dựng
 * phiên khách, không tạo liên hệ. Token không khớp hộp thư nào thì để nguyên.
 */
class RestrictWidgetEmbedding
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $websiteToken = $request->query('website_token');

        if (! is_string($websiteToken) || $websiteToken === '') {
            return $response;
        }

        $policy = WebWidget::query()
            ->where('website_token', $websiteToken)
            ->first()
            ?->frameAncestorsPolicy($request->headers->get('Origin'));

        if ($policy !== null) {
            $response->headers->set('Content-Security-Policy', $policy);
        }

        return $response;
    }
}
