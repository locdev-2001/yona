<?php

namespace App\Services\Conversations\UnreadCounts;

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Facades\DB;

/**
 * Định nghĩa DUY NHẤT của "hội thoại chưa đọc" mà một người thấy: đang mở, có ít
 * nhất một tin khách gửi sau mốc đã xem, trong hộp thư người đó được vào. Badge
 * sidebar và số trên chuông cùng đếm từ đây.
 */
final class UnreadConversations
{
    public static function query(Account $account, User $user, AccountUser $accountUser): QueryBuilder
    {
        return self::anyStatus($account, $user, $accountUser)
            ->where('conversations.status', Conversation::STATUS_OPEN);
    }

    // "Đánh dấu tất cả đã đọc": như mở từng hội thoại có tin chưa đọc mà người này thấy,
    // mọi trạng thái — chấm ở danh sách đã giải quyết cũng phải tắt. Có $inboxIds thì chỉ trong các kênh đó.
    /** @param  list<int>|null  $inboxIds */
    public static function markAllSeen(Account $account, User $user, AccountUser $accountUser, ?array $inboxIds = null): void
    {
        $seenAt = now();
        $unseen = fn (): QueryBuilder => self::anyStatus($account, $user, $accountUser)
            ->when($inboxIds !== null, fn (QueryBuilder $query) => $query->whereIn('conversations.inbox_id', $inboxIds));

        // Cột của người được giao trước: sau khi ghi agent_last_seen_at thì không còn hội thoại nào "chưa đọc" để lọc.
        $unseen()->where('conversations.assignee_id', $user->id)->update(['assignee_last_seen_at' => $seenAt]);
        $unseen()->update(['agent_last_seen_at' => $seenAt]);
    }

    private static function anyStatus(Account $account, User $user, AccountUser $accountUser): QueryBuilder
    {
        return DB::table('conversations')
            ->where('conversations.account_id', $account->id)
            ->whereIn('conversations.inbox_id', $user->assignedInboxes($account, $accountUser)->select('inboxes.id'))
            ->whereRaw(Conversation::unreadMessagesCountSql().' > 0');
    }
}
