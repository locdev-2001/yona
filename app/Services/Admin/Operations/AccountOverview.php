<?php

namespace App\Services\Admin\Operations;

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Message;
use App\Models\ProductEvent;
use App\Models\Sticker;
use App\Models\StickerPack;
use App\Models\SuperAdminImpersonation;
use App\Models\User;
use App\Services\Admin\Operations\ChannelHealth\ChannelHealthInspector;
use App\Services\ProductEvents\ProductEventName;
use App\Support\SuperAdminArea;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

// Dữ liệu trang account 360: một chỗ gom thông tin, người dùng, kênh, số liệu,
// kho sticker riêng và lịch sử đăng nhập hộ của một account.
final class AccountOverview
{
    public const RECENT_IMPERSONATIONS = 10;

    public function __construct(
        private readonly ChannelHealthInspector $channelHealth,
        private readonly FeatureUsage $featureUsage,
    ) {}

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
            'onboarding' => $this->onboarding($account),
            'timeline' => AccountActivity::timeline($account),
            'features' => $this->featureUsage->forAccount($account),
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
                'featureUsage' => SuperAdminArea::url('feature_usage'),
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

    // Tiến độ kích hoạt: CÙNG sáu bước, cùng tên và cùng định nghĩa với phễu kích hoạt ở trang Tổng quan
    // (ActivationFunnelWidget::STEPS) và mốc kích hoạt ở Mức dùng tính năng (tên sự kiện sản phẩm).
    // Khác phễu ở một chỗ: đây là một tài khoản nên mỗi bước đứng riêng (không đòi đã qua bước trước),
    // ngày là lần đầu ghi nhận. Bước onboarding đang đứng hiện thành dòng riêng ở đầu thẻ.
    /** @return array{step: ?string, stepLabel: ?string, milestones: list<array{key: string, label: string, done: bool, at: ?string}>} */
    private function onboarding(Account $account): array
    {
        $step = $account->onboardingStep();
        $firstEvent = fn (ProductEventName $name) => ProductEvent::query()
            ->where('account_id', $account->id)
            ->where('name', $name->value)
            ->min('occurred_at');
        $messages = Message::query()->where('account_id', $account->id);
        $milestones = [
            'signed_up' => $account->created_at,
            'confirmed_email' => $firstEvent(ProductEventName::EmailConfirmed),
            'created_inbox' => $account->inboxes()->min('created_at'),
            'connected_channel' => $firstEvent(ProductEventName::ChannelConnected),
            'received_message' => (clone $messages)->where('message_type', Message::TYPE_INCOMING)->min('created_at'),
            // Như phễu: tin ra công khai do nhân viên gửi (không tính bot, tự động hay ghi chú nội bộ).
            'replied' => (clone $messages)
                ->where('message_type', Message::TYPE_OUTGOING)
                ->where('private', false)
                ->where('sender_type', (new User)->getMorphClass())
                ->min('created_at'),
        ];

        return [
            'step' => $step,
            'stepLabel' => $step === null ? null : $this->translated("admin_operations.ACCOUNT_OVERVIEW.ONBOARDING.STEPS.{$step}", $step),
            'milestones' => array_map(
                fn (string $key, mixed $at) => [
                    'key' => $key,
                    'label' => (string) __('admin_dashboard.FUNNEL_STEPS.'.strtoupper($key)),
                    'done' => $at !== null,
                    'at' => $this->iso($at),
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
