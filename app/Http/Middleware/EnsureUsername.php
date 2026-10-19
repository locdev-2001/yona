<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Chưa chọn username thì chưa ai tìm thấy mình: mọi trang chat dẫn về màn chào mừng.
class EnsureUsername
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user() !== null && $request->user()->username === null) {
            return redirect()->route('chat.welcome');
        }

        return $next($request);
    }
}
