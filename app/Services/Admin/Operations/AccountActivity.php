<?php

namespace App\Services\Admin\Operations;

use App\Models\Account;
use App\Models\Inbox;
use App\Models\Message;
use Illuminate\Database\Eloquent\Builder;

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
}
