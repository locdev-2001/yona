<?php

namespace App\Http\Middleware;

use App\Models\Account;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Tính năng account chưa bật thì route như chưa từng tồn tại (404), không lộ
// dấu vết qua 401/403. Đặt sau account.scope để có currentAccount.
class EnsureAccountFeatureEnabled
{
    public function handle(Request $request, Closure $next, string $feature): Response
    {
        $account = $request->attributes->get('currentAccount');

        abort_unless($account instanceof Account && $account->featureEnabled($feature), 404);

        return $next($request);
    }
}
