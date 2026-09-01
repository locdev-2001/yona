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

        return Inertia::render('dashboard/conversation/ConversationView');
    }

    // Tương đương route inbox_conversation: /conversations/{display_id}.
    public function conversation(Request $request, Account $account, int $conversationId): Response
    {
        return Inertia::render('dashboard/conversation/ConversationView', [
            'conversationId' => $conversationId,
        ]);
    }

    // Tương đương route inbox_dashboard: /inbox/{inbox_id} (+ chọn conversation).
    public function inbox(Request $request, Account $account, int $inboxId, ?int $conversationId = null): Response
    {
        return Inertia::render('dashboard/conversation/ConversationView', [
            'inboxId' => $inboxId,
            'conversationId' => $conversationId,
        ]);
    }

    public function placeholder(Request $request, Account $account, string $view): Response
    {
        return Inertia::render('dashboard/PlaceholderView', [
            'view' => $view,
        ]);
    }
}
