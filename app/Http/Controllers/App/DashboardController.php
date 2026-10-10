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

    // Bản nháp hội thoại mới ngay trong khung Inbox; `contact_id` điền sẵn người nhận,
    // `inbox_id` / `team_id` / `label` giữ bộ lọc cột danh sách đang xem lúc bấm soạn.
    public function compose(Request $request, Account $account): Response
    {
        $label = $request->query('label');

        return Inertia::render('dashboard/conversation/ConversationView', [
            'isComposing' => true,
            'composeContactId' => $this->positiveIntQuery($request, 'contact_id'),
            'inboxId' => $this->positiveIntQuery($request, 'inbox_id') ?? 0,
            'teamId' => $this->positiveIntQuery($request, 'team_id') ?? 0,
            'label' => is_string($label) ? $label : '',
        ]);
    }

    private function positiveIntQuery(Request $request, string $key): ?int
    {
        $value = filter_var($request->query($key), FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);

        return $value === false ? null : $value;
    }

    // Tương đương route team_conversations: /team/{team_id} (+ chọn conversation).
    public function team(Request $request, Account $account, int $teamId, ?int $conversationId = null): Response
    {
        return Inertia::render('dashboard/conversation/ConversationView', [
            'teamId' => $teamId,
            'conversationId' => $conversationId,
        ]);
    }

    // Tương đương route label_conversations: /label/{label} (+ chọn conversation).
    public function label(Request $request, Account $account, string $label, ?int $conversationId = null): Response
    {
        return Inertia::render('dashboard/conversation/ConversationView', [
            'label' => $label,
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
