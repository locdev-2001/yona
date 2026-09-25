<?php

namespace App\Http\Middleware;

use App\Support\CurrentContact;
use App\Support\Widget\LazyWidgetContactResolver;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Biên VIẾT của khách website — đặt trên các hành động thật đầu tiên (gửi tin,
// mở hội thoại, cập nhật/gắn định danh liên hệ): phiên còn "treo" (chưa có
// contact_inbox nào khớp source_id) thì dựng NGAY TẠI ĐÂY qua
// LazyWidgetContactResolver, khác với EnsureWidgetContact chỉ chặn 404 cho các
// endpoint đọc/phụ không được phép tự tạo khách.
class ResolveOrCreateWidgetContact
{
    public function __construct(private readonly LazyWidgetContactResolver $resolver) {}

    public function handle(Request $request, Closure $next): Response
    {
        $contactInbox = $request->attributes->get(ResolveWidgetChannel::CONTACT_INBOX);

        if ($contactInbox !== null) {
            return $next($request);
        }

        $channel = $request->attributes->get(ResolveWidgetChannel::CHANNEL);
        $payload = $request->attributes->get(ResolveWidgetChannel::AUTH_PAYLOAD, []);

        $contactInbox = $this->resolver->resolve($channel, $payload, $request);

        abort_if($contactInbox === null, 404, 'Resource could not be found');

        $request->attributes->set(ResolveWidgetChannel::CONTACT_INBOX, $contactInbox);

        return CurrentContact::run($contactInbox->contact, fn () => $next($request));
    }
}
