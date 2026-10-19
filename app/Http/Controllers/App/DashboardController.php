<?php

namespace App\Http\Controllers\App;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Services\Users\PersonalAccounts;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request, PersonalAccounts $accounts): RedirectResponse
    {
        $account = $accounts->ensureFor($request->user());

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

    // Link cũ /inbox/{id}[/conversations/{id}]: kênh chuyển lên query string.
    public function inbox(Request $request, Account $account, int $inboxId, ?int $conversationId = null): RedirectResponse
    {
        return $this->redirectToFilteredList($request, $account, $conversationId, ['inbox' => $inboxId]);
    }

    // Bản nháp hội thoại mới ngay trong khung Inbox; `contact_id` điền sẵn người nhận,
    // `team_id` giữ nhóm đang xem; kênh/nhãn đang lọc đi theo query `inbox`/`label`
    // và do trình duyệt đọc.
    public function compose(Request $request, Account $account): Response
    {
        return Inertia::render('dashboard/conversation/ConversationView', [
            'isComposing' => true,
            'composeContactId' => $this->positiveIntQuery($request, 'contact_id'),
            'teamId' => $this->positiveIntQuery($request, 'team_id') ?? 0,
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

    // Link cũ /label/{label}[/conversations/{id}]: nhãn chuyển lên query string.
    public function label(Request $request, Account $account, string $label, ?int $conversationId = null): RedirectResponse
    {
        return $this->redirectToFilteredList($request, $account, $conversationId, ['label' => $label]);
    }

    // Query đến (`messageId` của link thông báo…) đi theo; khoá bộ lọc của route thắng.
    // Trình duyệt đọc kênh/nhãn từ query (listFilters.ts), server chỉ ghi.
    private function redirectToFilteredList(Request $request, Account $account, ?int $conversationId, array $filterQuery): RedirectResponse
    {
        $path = $conversationId === null ? 'conversations' : "conversations/{$conversationId}";
        $query = http_build_query(array_merge($request->query(), $filterQuery), '', '&', PHP_QUERY_RFC1738);

        return redirect("/app/accounts/{$account->id}/{$path}?{$query}");
    }

    public function placeholder(Request $request, Account $account, string $view): Response
    {
        return Inertia::render('dashboard/PlaceholderView', [
            'view' => $view,
        ]);
    }
}
