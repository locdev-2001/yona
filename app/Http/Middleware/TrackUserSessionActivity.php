<?php

namespace App\Http\Middleware;

use App\Services\UserSessionTrackingService;
use App\Support\CurrentUserSession;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Tương đương UserSessionTrackingService#update_activity! gọi từ base controller
// của Chatwoot — làm mới last_activity_at (có throttle 5 phút trong service).
class TrackUserSessionActivity
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $clientId = CurrentUserSession::clientId($request);

        if ($user && $clientId) {
            (new UserSessionTrackingService($user, $request, $clientId))->updateActivity();
        }

        return $next($request);
    }
}
