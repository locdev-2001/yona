<?php

namespace App\Http\Middleware;

use App\Support\SuperAdminArea;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

// Guard `super_admin` dùng chung cookie phiên với guard `web`, nên phiên agent dài
// bao lâu thì console quản trị cũng sống bấy lâu. Middleware này cho riêng guard
// super admin hết hạn sau một khoảng không thao tác trong vùng super admin; guard
// `web` (kể cả phiên impersonate) không bị đụng tới.
class ExpireIdleSuperAdminSession
{
    public const LAST_SEEN_SESSION_KEY = 'super_admin_last_seen_at';

    private const GUARD = 'super_admin';

    public function handle(Request $request, Closure $next): Response
    {
        $guard = Auth::guard(self::GUARD);
        $session = $request->session();

        if (! $guard->check()) {
            $session->forget(self::LAST_SEEN_SESSION_KEY);

            return $next($request);
        }

        $lastSeenAt = $session->get(self::LAST_SEEN_SESSION_KEY);

        if ($lastSeenAt !== null && $this->idleTooLong((int) $lastSeenAt)) {
            $guard->logout();
            $session->forget(self::LAST_SEEN_SESSION_KEY);

            return $next($request);
        }

        // Phiên đăng nhập trước khi có mốc này: ghi mốc mới thay vì đá ra.
        if ($lastSeenAt === null || SuperAdminArea::matches($request)) {
            $session->put(self::LAST_SEEN_SESSION_KEY, now()->timestamp);
        }

        return $next($request);
    }

    private function idleTooLong(int $lastSeenAt): bool
    {
        $idleSeconds = (int) config('yona.super_admin_idle_minutes') * 60;

        return now()->timestamp - $lastSeenAt > $idleSeconds;
    }
}
