<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// `raise ActiveRecord::RecordNotFound unless @contact` của WebsiteTokenHelper
// #set_contact. Tách khỏi ResolveWidgetChannel vì configs (tự tạo khách mới) và
// inbox_members (skip_before_action :set_contact) chạy được khi chưa có khách.
class EnsureWidgetContact
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_if(
            $request->attributes->get(ResolveWidgetChannel::CONTACT_INBOX) === null,
            404,
            'Resource could not be found'
        );

        return $next($request);
    }
}
