<?php

namespace App\Http\Middleware;

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\AgentBot;
use App\Support\SharedModels;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

// Current context (Current.account/Current.account_user) —
// resolve account từ route, chặn ngoài thành viên, share cho Inertia.
class SetCurrentAccount
{
    public function handle(Request $request, Closure $next): Response
    {
        $account = $request->route('account');

        if (! $account instanceof Account) {
            $account = Account::query()->findOrFail($account);
        }

        // Account bị khoá từ console: không ai (agent, bot, token API) vào được nữa.
        if (! $account->isActive()) {
            abort_if($request->expectsJson() || $request->is('api/*'), response()->json(['error' => 'Account is suspended'], 403));
            abort(403, __('admin_operations.SUSPENSION.BLOCKED'));
        }

        app(SharedModels::class)->remember($account);

        // validate_token_api_access: account tắt API thì token không vào được.
        if ($request->attributes->get(AuthenticateApiAccessToken::AUTHENTICATED_BY_TOKEN)
            && ! $account->apiAndWebhooksEnabled()) {
            abort(response()->json(['error' => 'API access is not enabled for this account'], 403));
        }

        // Agent bot không phải thành viên account: chỉ cần thuộc account (hoặc là
        // system bot) rồi đi tiếp; không có account_user, không share Inertia.
        $user = $request->user();
        if ($user instanceof AgentBot) {
            abort_unless($user->account_id === null || $user->account_id === $account->id, 404);

            $request->attributes->set('currentAccount', $account);

            return $next($request);
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
                // json.features của _account.json.jbuilder (enabled_features).
                'features' => $account->enabledFeatures(),
            ],
            'currentAccountUser' => fn () => [
                'role' => $accountUser->roleName(),
                'availability' => $accountUser->availabilityName(),
                'auto_offline' => $accountUser->auto_offline,
            ],
            // Nhóm Channels trên sidebar (Sidebar.vue lấy từ store inboxes/getInboxes;
            // agent chỉ thấy inbox mình là member — InboxPolicy::Scope).
            'inboxes' => fn () => $request->user()
                ->assignedInboxes($account, $accountUser)
                ->orderByRaw('lower(name) ASC')
                // `channel` nạp kèm (morphTo gom theo loại kênh, không N+1) để lộ
                // `capabilities` — FE gate tính năng theo năng lực, không theo
                // channel_type (docs/channel-capabilities.md §3). `avatar` nạp kèm
                // cho danh tính tài khoản kênh (tin gửi từ điện thoại mang ảnh này).
                ->with(['channel', 'avatar'])
                ->get(['id', 'name', 'channel_type', 'channel_id'])
                ->map(fn ($inbox) => [
                    'id' => $inbox->id,
                    'name' => $inbox->name,
                    'channel_type' => $inbox->channel_type,
                    'capabilities' => $inbox->capabilities()->values(),
                    'avatar_url' => $inbox->avatarUrl(),
                    'platform' => $inbox->platform()->toArray(),
                    // Icon cảnh báo mất phiên trên sidebar Kênh + thẻ hội thoại
                    // (ChannelLeaf.vue của gốc đọc `inbox.reauthorization_required`).
                    'reauthorization_required' => $inbox->reauthorizationRequired(),
                ]),
            // Nhóm Teams trên sidebar (Sidebar.vue lấy từ getter teams/getMyTeams:
            // chỉ team user là member).
            'teams' => fn () => $request->user()
                ->teams()
                ->where('teams.account_id', $account->id)
                ->orderByRaw('lower(teams.name) ASC')
                ->get(['teams.id', 'teams.name'])
                ->map(fn ($team) => [
                    'id' => $team->id,
                    'name' => $team->name,
                ]),
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
