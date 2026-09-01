<?php

namespace App\Http\Middleware;

use App\Models\AccessToken;
use App\Models\User;
use Closure;
use Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

// Port từ AccessTokenAuthHelper của Chatwoot: cùng một endpoint nhận cả session
// (dashboard) lẫn header api_access_token (Application API). Header có mặt →
// token quyết định; token sai → 401 'Invalid Access Token' như bản gốc.
// Owner AgentBot vào ở D4 — hiện chỉ User.
// Implement AuthenticatesRequests để nhận cùng bậc ưu tiên với middleware `auth`
// trong middlewarePriority — nếu không, `auth` bị đẩy lên chạy trước và chặn
// request token bằng 401 trước khi middleware này kịp xác thực.
class AuthenticateApiAccessToken implements AuthenticatesRequests
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->header('api_access_token');

        if ($token === null) {
            return $next($request);
        }

        $owner = AccessToken::query()->where('token', $token)->first()?->owner;

        if (! $owner instanceof User) {
            return response()->json(['error' => 'Invalid Access Token'], 401);
        }

        Auth::setUser($owner);

        return $next($request);
    }
}
