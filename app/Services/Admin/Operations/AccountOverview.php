<?php

namespace App\Services\Admin\Operations;

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Message;
use App\Models\Sticker;
use App\Models\StickerPack;
use App\Models\SuperAdminImpersonation;
use App\Services\Admin\Operations\ChannelHealth\ChannelHealthInspector;
use App\Support\SuperAdminArea;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

// Dữ liệu trang account 360: một chỗ gom thông tin, người dùng, kênh, số liệu,
// kho sticker riêng và lịch sử đăng nhập hộ của một account.
final class AccountOverview
{
    public const RECENT_IMPERSONATIONS = 10;

    public function __construct(private readonly ChannelHealthInspector $channelHealth) {}

    public function find(int $accountId): Account
    {
        return AccountActivity::withActivityColumns(Account::query())->findOrFail($accountId);
    }

    /** @return array<string, mixed> */
    public function build(Account $account): array
    {
        $accountUsers = $account->accountUsers()->with('user')->orderBy('id')->get();

        return [
            'account' => $this->accountSummary($account),
            'suspension' => [
                'categories' => array_map(
                    fn (string $category) => ['value' => $category, 'label' => (string) __("super_admin.account_suspension.categories.{$category}")],
                    AccountSuspension::categories(),
                ),
                'maxReasonLength' => AccountSuspension::MAX_REASON_LENGTH,
                'history' => AccountSuspension::history($account),
            ],
            'users' => $accountUsers->map(fn (AccountUser $accountUser) => [
                'id' => $accountUser->user_id,
                'name' => $accountUser->user?->name,
                'email' => $accountUser->user?->email,
                'role' => $accountUser->roleName(),
                'confirmed' => $accountUser->user?->confirmed_at !== null,
                'lastSignInAt' => $this->iso($accountUser->user?->last_sign_in_at),
                'activeAt' => $this->iso($accountUser->active_at),
                'url' => SuperAdminArea::url("users/{$accountUser->user_id}"),
                'impersonateUrl' => SuperAdminArea::url("users/{$accountUser->user_id}/impersonate"),
            ])->all(),
            'inboxes' => $this->channelHealth->forAccount($account),
            'stats' => [...$this->stats($account), 'users' => $accountUsers->count()],
            'usage' => AccountActivity::dailyMessages($account),
            'onboarding' => $this->onboarding($account, $accountUsers->count()),
            'timeline' => AccountActivity::timeline($account),
            'stickers' => $this->stickerStats($account),
            'impersonations' => $this->recentImpersonations($accountUsers->pluck('user_id')->all()),
            'urls' => [
                'show' => SuperAdminArea::url("accounts/{$account->id}"),
                'edit' => SuperAdminArea::url("accounts/{$account->id}/edit"),
                'stickers' => SuperAdminArea::url("accounts/{$account->id}/sticker_packs"),
                'auditLogs' => SuperAdminArea::url("audit_logs?subject_type=accounts&subject_id={$account->id}"),
                'data' => SuperAdminArea::url("data/inboxes?filter[account_id]={$account->id}"),
                'suspend' => SuperAdminArea::url("accounts/{$account->id}/suspend"),
                'unsuspend' => SuperAdminArea::url("accounts/{$account->id}/unsuspend"),
                'impersonations' => SuperAdminArea::url('impersonations'),
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function accountSummary(Account $account): array
    {
        return [
            'id' => $account->id,
            'name' => $account->name,
            'locale' => $account->locale,
            'status' => $account->isActive() ? 'active' : 'suspended',
            'createdAt' => $this->iso($account->created_at),
        ];
    }

    /** @return array<string, mixed> */
    private function stats(Account $account): array
    {
        return [
            'contacts' => $account->contacts()->count(),
            'conversations' => $account->conversations()->count(),
            'inboxes' => (int) $account->{AccountActivity::INBOXES_COUNT},
            'messages7d' => (int) $account->{AccountActivity::RECENT_MESSAGES_COUNT},
            'messages30d' => AccountActivity::messageCount($account, AccountActivity::MONTH_MESSAGE_DAYS),
            'lastActivityAt' => $this->iso($account->{AccountActivity::LAST_ACTIVITY_AT}),
        ];
    }

    // Mốc kích hoạt: bước onboarding đang đứng + các việc đầu tiên đã làm chưa (kèm lúc làm).
    /** @return array{step: ?string, stepLabel: ?string, milestones: list<array{key: string, label: string, done: bool, at: ?string}>} */
    private function onboarding(Account $account, int $usersCount): array
    {
        $step = $account->onboardingStep();
        $firstOf = fn (int $type) => Message::query()->where('account_id', $account->id)->where('message_type', $type)->min('created_at');
        $milestones = [
            'account_details' => [$step !== 'account_details', null],
            'first_inbox' => [null, $account->inboxes()->min('created_at')],
            'team_invited' => [$usersCount > 1, null],
            'first_incoming' => [null, $firstOf(Message::TYPE_INCOMING)],
            'first_reply' => [null, $firstOf(Message::TYPE_OUTGOING)],
        ];

        return [
            'step' => $step,
            'stepLabel' => $step === null ? null : $this->translated("admin_operations.ACCOUNT_OVERVIEW.ONBOARDING.STEPS.{$step}", $step),
            'milestones' => array_map(
                fn (string $key, array $state) => [
                    'key' => $key,
                    'label' => (string) __("admin_operations.ACCOUNT_OVERVIEW.ONBOARDING.MILESTONES.{$key}"),
                    'done' => $state[0] ?? $state[1] !== null,
                    'at' => $this->iso($state[1]),
                ],
                array_keys($milestones),
                $milestones,
            ),
        ];
    }

    private function translated(string $key, string $fallback): string
    {
        $label = __($key);

        return $label === $key ? $fallback : (string) $label;
    }

    /** @return array{packs: int, stickers: int} */
    private function stickerStats(Account $account): array
    {
        $packIds = StickerPack::query()->where('account_id', $account->id)->pluck('id');

        return [
            'packs' => $packIds->count(),
            'stickers' => Sticker::query()->whereIn('sticker_pack_id', $packIds)->count(),
        ];
    }

    /**
     * @param  list<int>  $userIds
     * @return list<array<string, mixed>>
     */
    private function recentImpersonations(array $userIds): array
    {
        if ($userIds === []) {
            return [];
        }

        return SuperAdminImpersonation::query()
            ->with(['superAdmin:id,name,email', 'targetUser:id,name,email'])
            ->whereIn('target_user_id', $userIds)
            ->latest('id')
            ->limit(self::RECENT_IMPERSONATIONS)
            ->get()
            ->map(fn (SuperAdminImpersonation $impersonation) => [
                'id' => $impersonation->id,
                'superAdmin' => $impersonation->superAdmin?->only(['id', 'name', 'email']),
                'targetUser' => $impersonation->targetUser?->only(['id', 'name', 'email']),
                'reason' => $impersonation->reason,
                'createdAt' => $this->iso($impersonation->created_at),
                'usedAt' => $this->iso($impersonation->used_at),
                'url' => SuperAdminArea::url("impersonations/{$impersonation->id}"),
            ])
            ->all();
    }

    private function iso(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return $value instanceof CarbonInterface ? $value->toIso8601String() : Carbon::parse($value)->toIso8601String();
    }
}
