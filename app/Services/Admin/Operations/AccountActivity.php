<?php

namespace App\Services\Admin\Operations;

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\SuperAdminAuditLog;
use App\Models\SuperAdminImpersonation;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

// Số liệu hoạt động của account tính bằng subquery tương quan trên chính truy
// vấn account (một câu SQL cho cả trang, không N+1). Danh sách account và trang
// account 360 cùng đọc từ đây.
final class AccountActivity
{
    // Account không có tin nào trong ngần này ngày (và đã tồn tại lâu hơn thế) là "nguy cơ rời".
    public const CHURN_RISK_DAYS = 14;

    public const RECENT_MESSAGE_DAYS = 7;

    public const MONTH_MESSAGE_DAYS = 30;

    public const LAST_ACTIVITY_AT = 'last_activity_at';

    public const INBOXES_COUNT = 'inboxes_count';

    public const RECENT_MESSAGES_COUNT = 'messages_7d';

    public const TIMELINE_LIMIT = 30;

    public static function withActivityColumns(Builder $accounts): Builder
    {
        if ($accounts->getQuery()->columns === null) {
            $accounts->select($accounts->getModel()->qualifyColumn('*'));
        }

        return $accounts->addSelect([
            self::LAST_ACTIVITY_AT => Message::query()
                ->selectRaw('max(messages.created_at)')
                ->whereColumn('messages.account_id', 'accounts.id'),
            self::INBOXES_COUNT => Inbox::query()
                ->selectRaw('count(*)')
                ->whereColumn('inboxes.account_id', 'accounts.id'),
            self::RECENT_MESSAGES_COUNT => self::correlatedMessagesSince(self::RECENT_MESSAGE_DAYS)
                ->selectRaw('count(*)'),
        ]);
    }

    public static function whereChurnRisk(Builder $accounts, int $days = self::CHURN_RISK_DAYS): Builder
    {
        return $accounts
            ->where('accounts.created_at', '<', now()->subDays($days))
            ->whereNotExists(self::correlatedMessagesSince($days)->selectRaw('1')->getQuery());
    }

    private static function correlatedMessagesSince(int $days): Builder
    {
        return Message::query()
            ->whereColumn('messages.account_id', 'accounts.id')
            ->where('messages.created_at', '>=', now()->subDays($days));
    }

    public static function messageCount(Account $account, int $days): int
    {
        return Message::query()
            ->where('account_id', $account->id)
            ->where('created_at', '>=', now()->subDays($days))
            ->count();
    }

    /**
     * Số tin mỗi ngày trong `$days` ngày gần nhất, ngày trống = 0 (đủ điểm cho sparkline).
     *
     * @return list<array{date: string, count: int}>
     */
    public static function dailyMessages(Account $account, int $days = self::MONTH_MESSAGE_DAYS): array
    {
        $start = now()->startOfDay()->subDays($days - 1);

        $counts = Message::query()
            ->where('account_id', $account->id)
            ->where('created_at', '>=', $start)
            ->selectRaw('date(created_at) as day, count(*) as total')
            ->groupBy('day')
            ->pluck('total', 'day');

        return array_map(function (int $offset) use ($start, $counts) {
            $date = $start->copy()->addDays($offset)->toDateString();

            return ['date' => $date, 'count' => (int) ($counts[$date] ?? 0)];
        }, range(0, $days - 1));
    }

    /**
     * Dòng thời gian gần đây của account: gom từ các bảng đã có, mới nhất trước.
     *
     * @return list<array{type: string, at: string, title: string, detail: ?string}>
     */
    public static function timeline(Account $account, int $limit = self::TIMELINE_LIMIT): array
    {
        $events = [self::event('account_created', $account->created_at, ['name' => $account->name])];

        foreach ($account->accountUsers()->with('user:id,name,email')->latest('id')->limit($limit)->get() as $accountUser) {
            /** @var AccountUser $accountUser */
            $events[] = self::event('user_joined', $accountUser->created_at, [
                'name' => $accountUser->user?->name ?? "#{$accountUser->user_id}",
                'role' => $accountUser->roleName(),
            ]);
        }

        foreach ($account->inboxes()->latest('id')->limit($limit)->get(['id', 'name', 'created_at']) as $inbox) {
            $events[] = self::event('inbox_created', $inbox->created_at, ['name' => $inbox->name]);
        }

        foreach (AccountSuspension::history($account) as $suspension) {
            if (isset($suspension['suspended_at'])) {
                $events[] = self::event('suspended', $suspension['suspended_at'], ['reason' => (string) ($suspension['reason'] ?? '')]);
            }
        }

        $userIds = $account->accountUsers()->pluck('user_id');
        $impersonations = SuperAdminImpersonation::query()
            ->with(['superAdmin:id,name,email', 'targetUser:id,name,email'])
            ->whereIn('target_user_id', $userIds)
            ->latest('id')
            ->limit($limit)
            ->get();
        foreach ($impersonations as $impersonation) {
            $events[] = self::event('impersonated', $impersonation->created_at, [
                'admin' => $impersonation->superAdmin?->email ?? '—',
                'user' => $impersonation->targetUser?->email ?? '—',
            ], $impersonation->reason);
        }

        $auditLogs = SuperAdminAuditLog::query()
            ->where('subject_type', 'accounts')
            ->where('subject_id', $account->id)
            ->latest('id')
            ->limit($limit)
            ->get();
        foreach ($auditLogs as $log) {
            $events[] = self::event('admin_action', $log->created_at, [
                'admin' => $log->super_admin_email ?? '—',
                'action' => $log->action,
            ]);
        }

        $lastMessageAt = Message::query()->where('account_id', $account->id)->max('created_at');
        if ($lastMessageAt !== null) {
            $events[] = self::event('last_message', $lastMessageAt, []);
        }

        $events = array_values(array_filter($events));
        usort($events, fn (array $left, array $right) => strcmp($right['at'], $left['at']));

        return array_slice($events, 0, $limit);
    }

    /**
     * @param  array<string, string>  $replace
     * @return array{type: string, at: string, title: string, detail: ?string}|null
     */
    private static function event(string $type, mixed $at, array $replace, ?string $detail = null): ?array
    {
        if ($at === null || $at === '') {
            return null;
        }

        $moment = ($at instanceof CarbonInterface ? $at->copy() : Carbon::parse($at))->utc();

        return [
            'type' => $type,
            'at' => $moment->toIso8601String(),
            'title' => (string) __("admin_operations.ACCOUNT_OVERVIEW.TIMELINE.{$type}", $replace),
            'detail' => $detail,
        ];
    }
}
