<?php

namespace App\Http\Middleware;

use App\Support\CurrentContact;
use App\Support\Widget\LazyWidgetContactResolver;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Biên VIẾT của khách website: phiên còn "treo" thì dựng contact_inbox ngay tại
// đây, khác EnsureWidgetContact chỉ chặn 404 cho endpoint không được tự tạo khách.
class ResolveOrCreateWidgetContact
{
    public function __construct(private readonly LazyWidgetContactResolver $resolver) {}

    public function handle(Request $request, Closure $next): Response
    {
        $contactInbox = $request->attributes->get(ResolveWidgetChannel::CONTACT_INBOX)
            ?? $this->resolver->resolve($request);

        abort_if($contactInbox === null, 404, 'Resource could not be found');

        return CurrentContact::run($contactInbox->contact, fn () => $next($request));
    }
}
