<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;

// Request Application API xác thực bằng header api_access_token (curl/bot,
// không có cookie phiên) — token tự nó đã chống CSRF nên bỏ qua kiểm tra,
// đúng hành vi API controller của Chatwoot (Rails không bật forgery cho /api).
class ValidateCsrfToken extends PreventRequestForgery
{
    protected function inExceptArray($request): bool
    {
        if ($request->is('api/*') && $request->headers->has('api_access_token')) {
            return true;
        }

        return parent::inExceptArray($request);
    }
}
