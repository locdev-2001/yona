<?php

namespace App\Http\Middleware;

use App\Models\AccessToken;
use App\Models\PlatformApp;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Port từ `ensure_access_token`/`set_platform_app` của
// Header api_access_token phải trỏ tới token do một PlatformApp sở hữu.
class AuthenticatePlatformApp
{
    public const PLATFORM_APP = 'platformApp';

    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->header('api_access_token');
        $owner = $token ? AccessToken::query()->where('token', $token)->first()?->owner : null;

        if (! $owner instanceof PlatformApp) {
            return response()->json(['error' => 'Invalid access_token'], 401);
        }

        $request->attributes->set(self::PLATFORM_APP, $owner);

        return $next($request);
    }
}
