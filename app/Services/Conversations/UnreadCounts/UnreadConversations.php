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
        return DB::table('conversations')
            ->where('conversations.account_id', $account->id)
            ->where('conversations.status', Conversation::STATUS_OPEN)
            ->whereIn('conversations.inbox_id', $user->assignedInboxes($account, $accountUser)->select('inboxes.id'))
            ->whereRaw(Conversation::unreadMessagesCountSql().' > 0');
    }
}
