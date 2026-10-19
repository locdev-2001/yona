<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Ghi "lần hoạt động cuối" của người dùng, tối đa một lần mỗi phút.
class TouchLastSeen
{
    private const INTERVAL_SECONDS = 60;

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user !== null && ($user->last_seen_at === null || $user->last_seen_at->diffInSeconds(now()) >= self::INTERVAL_SECONDS)) {
            $user->forceFill(['last_seen_at' => now()])->saveQuietly();
        }

        return $next($request);
    }
}
