<?php

namespace App\Services\Admin\Operations;

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\ProductEvent;
use App\Models\Sticker;
use App\Models\StickerPack;
use App\Models\SuperAdminAuditLog;
use App\Models\SuperAdminImpersonation;
use App\Services\Admin\Metrics\ChannelTypes;
use App\Services\Admin\Metrics\DateRange;
use App\Services\ProductEvents\ProductEventName;
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

        array_push($events, ...self::productEvents($account, $limit));

        $lastMessageAt = Message::query()->where('account_id', $account->id)->max('created_at');
        if ($lastMessageAt !== null) {
            $events[] = self::event('last_message', $lastMessageAt, []);
        }

        $events = array_values(array_filter($events));
        usort($events, fn (array $left, array $right) => strcmp($right['at'], $left['at']));

        return array_slice($events, 0, $limit);
    }

    // Sự kiện sản phẩm đã có dòng riêng từ bảng gốc (tạo tài khoản, thêm hộp thư).
    private const TIMELINE_SKIPPED_PRODUCT_EVENTS = [ProductEventName::AccountSignedUp, ProductEventName::InboxCreated];

    /**
     * Sự kiện sản phẩm thành câu: mốc kích hoạt từng dòng (kèm nền tảng, bước),
     * lượt dùng tính năng gộp theo tính năng và ngày ("Gửi sticker", 5 lần).
     *
     * @return list<array{type: string, at: string, title: string, detail: ?string}>
     */
    private static function productEvents(Account $account, int $limit): array
    {
        $activation = array_values(array_diff(
            array_map(fn (ProductEventName $name) => $name->value, array_filter(ProductEventName::cases(), fn (ProductEventName $name) => ! $name->isFeature())),
            array_map(fn (ProductEventName $name) => $name->value, self::TIMELINE_SKIPPED_PRODUCT_EVENTS),
        ));
        $features = array_map(fn (ProductEventName $name) => $name->value, array_filter(ProductEventName::cases(), fn (ProductEventName $name) => $name->isFeature()));

        $events = [];
        $milestones = ProductEvent::query()
            ->where('account_id', $account->id)
            ->whereIn('name', $activation)
            ->latest('occurred_at')
            ->limit($limit)
            ->get(['name', 'properties', 'occurred_at']);
        foreach ($milestones as $milestone) {
            $events[] = self::productEvent($milestone->name, $milestone->occurred_at, self::productReplacements((array) $milestone->properties), null);
        }

        $usage = ProductEvent::query()
            ->toBase()
            ->where('account_id', $account->id)
            ->whereIn('name', $features)
            ->selectRaw('name, '.DateRange::localDateSql('occurred_at').' as local_day, count(*) as total, max(occurred_at) as last_at')
            ->groupBy('name', 'local_day')
            ->orderByDesc('last_at')
            ->limit($limit)
            ->get();
        foreach ($usage as $row) {
            $count = (int) $row->total;
            $detail = $count > 1 ? (string) __('admin_operations.ACCOUNT_OVERVIEW.FEATURES.TIMES', ['count' => (string) $count]) : null;
            $events[] = self::productEvent($row->name, $row->last_at, [], $detail);
        }

        return array_values(array_filter($events));
    }

    /**
     * @param  array<string, mixed>  $properties
     * @return array<string, string>
     */
    private static function productReplacements(array $properties): array
    {
        $replace = [];
        if (is_string($properties['platform'] ?? null)) {
            $platform = app(ChannelTypes::class)->platformByKey($properties['platform']);
            $replace['platform'] = $platform->name !== '' ? $platform->name : (string) __('admin_operations.COMMON.UNKNOWN');
        }
        if (is_string($properties['method'] ?? null)) {
            $key = "admin_operations.PRODUCT_EVENTS.METHODS.{$properties['method']}";
            $replace['method'] = __($key) === $key ? $properties['method'] : (string) __($key);
        }
        if (is_string($properties['step'] ?? null)) {
            $key = "admin_operations.ACCOUNT_OVERVIEW.ONBOARDING.STEPS.{$properties['step']}";
            $replace['step'] = __($key) === $key ? $properties['step'] : (string) __($key);
        }

        return $replace;
    }

    /**
     * @param  array<string, string>  $replace
     * @return array{type: string, at: string, title: string, detail: ?string}|null
     */
    private static function productEvent(string $name, mixed $at, array $replace, ?string $detail): ?array
    {
        $event = self::event('product_event', $at, []);
        if ($event === null) {
            return null;
        }

        $replace += ['platform' => (string) __('admin_operations.COMMON.UNKNOWN'), 'method' => '', 'step' => ''];

        return [
            ...$event,
            'type' => "product.{$name}",
            'title' => (string) __("admin_operations.ACCOUNT_OVERVIEW.TIMELINE.PRODUCT.{$name}", $replace),
            'detail' => $detail,
        ];
    }

    // Mẫu route → khoá câu mô tả nằm ở AuditActionDescriber (dùng chung với trang Nhật ký
    // thao tác). Khoá lặp liền nhau (cùng người, cùng bộ, cách nhau dưới
    // AUDIT_GROUP_MINUTES) gộp thành một dòng có số đếm.

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
            $action = AuditActionDescriber::normalize((string) $log->action);
            if (in_array($action, self::SKIPPED_AUDIT_ACTIONS, true)) {
                continue;
            }

            $key = AuditActionDescriber::key($action) ?? (str_starts_with($action, 'DELETE ') ? 'other_delete' : 'other_change');
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
            $title = (string) AuditActionDescriber::sentence($group['key'], $group['pack'], $group['count']);
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
