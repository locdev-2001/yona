<?php

namespace App\Http\Controllers\App;

use App\Http\Controllers\Controller;
use App\Models\Account;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): RedirectResponse|Response
    {
        $account = $request->user()->accounts()->orderBy('accounts.id')->first();

        if (! $account) {
            return Inertia::render('dashboard/NoAccounts');
        }

        return redirect("/app/accounts/{$account->id}/dashboard");
    }

    public function show(Request $request, Account $account): RedirectResponse|Response
    {
        $accountUser = $request->attributes->get('currentAccountUser');

        if ($account->onboardingStep() === 'account_details' && $accountUser->isAdministrator()) {
            return redirect("/app/accounts/{$account->id}/onboarding");
        }

        return Inertia::render('dashboard/Index');
    }

    public function placeholder(Request $request, Account $account, string $view): Response
    {
        return Inertia::render('dashboard/PlaceholderView', [
            'view' => $view,
        ]);
    }
}
