<?php

namespace App\Http\Middleware;

use App\Models\Account;
use App\Models\AccountUser;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

// Current context của Chatwoot (Current.account/Current.account_user) —
// resolve account từ route, chặn ngoài thành viên, share cho Inertia.
class SetCurrentAccount
{
    public function handle(Request $request, Closure $next): Response
    {
        $account = $request->route('account');

        if (! $account instanceof Account) {
            $account = Account::query()->findOrFail($account);
        }

        $accountUser = $request->user()
            ?->accountUsers()
            ->where('account_id', $account->id)
            ->first();

        abort_unless($accountUser !== null, 404);

        $request->attributes->set('currentAccount', $account);
        $request->attributes->set('currentAccountUser', $accountUser);

        Inertia::share([
            'currentAccount' => fn () => [
                'id' => $account->id,
                'name' => $account->name,
                'locale' => $account->locale,
                'status' => $account->status,
            ],
            'currentAccountUser' => fn () => [
                'role' => $accountUser->roleName(),
                'availability' => $accountUser->availabilityName(),
                'auto_offline' => $accountUser->auto_offline,
            ],
            'userAccounts' => fn () => $request->user()->accountUsers()
                ->with('account:id,name')
                ->get()
                ->map(fn (AccountUser $membership) => [
                    'id' => $membership->account_id,
                    'name' => $membership->account->name,
                    'role' => $membership->roleName(),
                ])
                ->sortBy('name')
                ->values(),
        ]);

        return $next($request);
    }
}
