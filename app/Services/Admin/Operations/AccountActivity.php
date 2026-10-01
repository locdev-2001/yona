<?php

namespace App\Services\Admin\Operations;

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\Sticker;
use App\Models\StickerPack;
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
                'admin' => $impersonation->superAdmin?->email ?? '-',
                'user' => $impersonation->targetUser?->email ?? '-',
            ], $impersonation->reason);
        }

        $auditLogs = SuperAdminAuditLog::query()
            ->where('subject_type', 'accounts')
            ->where('subject_id', $account->id)
            ->latest('id')
            ->limit($limit)
            ->get();
        array_push($events, ...self::auditEvents($account, $auditLogs->all()));

        $lastMessageAt = Message::query()->where('account_id', $account->id)->max('created_at');
        if ($lastMessageAt !== null) {
            $events[] = self::event('last_message', $lastMessageAt, []);
        }

        $events = array_values(array_filter($events));
        usort($events, fn (array $left, array $right) => strcmp($right['at'], $left['at']));

        return array_slice($events, 0, $limit);
    }

    // Mẫu route đã ghi trong nhật ký (bỏ tiền tố api/) → khoá câu mô tả. Khoá lặp
    // liền nhau (cùng người, cùng bộ, cách nhau dưới AUDIT_GROUP_MINUTES) gộp thành một dòng có số đếm.
    private const AUDIT_ACTIONS = [
        'PUT accounts/{id}' => 'account_updated',
        'PATCH accounts/{id}' => 'account_updated',
        'DELETE accounts/{id}' => 'account_deleted',
        'POST accounts/{id}/reset_cache' => 'cache_reset',
        'POST accounts/{id}/unsuspend' => 'unsuspended',
        'POST accounts/{accountId}/sticker_packs' => 'pack_created',
        'PUT accounts/{accountId}/sticker_packs/{packId}' => 'pack_updated',
        'PATCH accounts/{accountId}/sticker_packs/{packId}' => 'pack_updated',
        'DELETE accounts/{accountId}/sticker_packs/{packId}' => 'pack_deleted',
        'POST accounts/{accountId}/sticker_packs/{packId}/move' => 'pack_moved',
        'POST accounts/{accountId}/sticker_packs/{packId}/publish' => 'pack_published',
        'POST accounts/{accountId}/sticker_packs/{packId}/unpublish' => 'pack_unpublished',
        'POST accounts/{accountId}/sticker_packs/{packId}/stickers' => 'stickers_added',
        'PUT accounts/{accountId}/sticker_packs/{packId}/stickers/order' => 'stickers_reordered',
        'PATCH accounts/{accountId}/sticker_packs/{packId}/stickers/{stickerId}' => 'stickers_updated',
        'DELETE accounts/{accountId}/sticker_packs/{packId}/stickers/{stickerId}' => 'stickers_deleted',
    ];

    // Khoá có đếm số lần (thêm/sửa/xoá nhiều sticker liền tay).
    private const COUNTED_AUDIT_ACTIONS = ['stickers_added', 'stickers_updated', 'stickers_deleted'];

    private const AUDIT_GROUP_MINUTES = 10;

    // Khoá account đã có trong lịch sử khoá (kèm lý do), không lặp lại từ nhật ký.
    private const SKIPPED_AUDIT_ACTIONS = ['POST accounts/{id}/suspend'];

    /**
     * Thao tác của quản trị viên thành câu đọc được: "Thêm 3 sticker vào bộ “Mặt cười”".
     *
     * @param  list<SuperAdminAuditLog>  $logs  mới nhất trước
     * @return list<array{type: string, at: string, title: string, detail: ?string}>
     */
    private static function auditEvents(Account $account, array $logs): array
    {
        $groups = [];
        foreach ($logs as $log) {
            $action = preg_replace('#^(\w+) api/#', '$1 ', (string) $log->action);
            if (in_array($action, self::SKIPPED_AUDIT_ACTIONS, true)) {
                continue;
            }

            $key = self::AUDIT_ACTIONS[$action] ?? (str_starts_with($action, 'DELETE ') ? 'other_delete' : 'other_change');
            $failed = (int) $log->response_status >= 400;
            $pack = str_contains($action, '{packId}') || $key === 'pack_created' ? self::auditPackName($account, $log) : null;
            $previous = $groups === [] ? null : $groups[array_key_last($groups)];

            if ($previous !== null
                && in_array($key, self::COUNTED_AUDIT_ACTIONS, true)
                && $previous['key'] === $key
                && $previous['pack'] === $pack
                && $previous['admin'] === $log->super_admin_email
                && $previous['failed'] === $failed
                && $previous['oldest']->diffInMinutes($log->created_at, true) <= self::AUDIT_GROUP_MINUTES) {
                $groups[array_key_last($groups)]['count']++;
                $groups[array_key_last($groups)]['oldest'] = $log->created_at;

                continue;
            }

            $groups[] = [
                'key' => $key,
                'pack' => $pack,
                'admin' => $log->super_admin_email,
                'failed' => $failed,
                'status' => (int) $log->response_status,
                'count' => 1,
                'at' => $log->created_at,
                'oldest' => $log->created_at,
            ];
        }

        return array_values(array_filter(array_map(function (array $group) {
            $variant = $group['pack'] === null ? 'NO_PACK' : 'PACK';
            $title = (string) __("admin_operations.ACCOUNT_OVERVIEW.AUDIT.{$group['key']}.{$variant}", [
                'count' => (string) $group['count'],
                'pack' => (string) $group['pack'],
            ]);
            $detail = $group['failed']
                ? __('admin_operations.ACCOUNT_OVERVIEW.AUDIT.FAILED_BY', ['admin' => $group['admin'] ?? '-', 'status' => (string) $group['status']])
                : __('admin_operations.ACCOUNT_OVERVIEW.AUDIT.BY', ['admin' => $group['admin'] ?? '-']);

            $event = self::event('admin_action', $group['at'], []);

            return $event === null ? null : [...$event, 'title' => $title, 'detail' => (string) $detail];
        }, $groups)));
    }

    // Nhật ký chỉ lưu mẫu route, không lưu packId: lấy tên từ dữ liệu gửi kèm (tạo/sửa bộ),
    // hoặc từ sticker của account được tạo cùng lúc với dòng nhật ký (tải sticker lên).
    private static function auditPackName(Account $account, SuperAdminAuditLog $log): ?string
    {
        $name = $log->changes['name'] ?? null;
        if (is_string($name) && $name !== '') {
            return $name;
        }

        if (! str_ends_with((string) $log->action, '{packId}/stickers') || $log->created_at === null) {
            return null;
        }

        $packId = Sticker::query()
            ->whereIn('sticker_pack_id', StickerPack::query()->where('account_id', $account->id)->select('id'))
            ->whereBetween('created_at', [$log->created_at->copy()->subSeconds(30), $log->created_at->copy()->addSeconds(2)])
            ->orderByDesc('created_at')
            ->value('sticker_pack_id');

        return $packId === null ? null : StickerPack::query()->whereKey($packId)->value('name');
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
