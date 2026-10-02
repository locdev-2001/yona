<?php

namespace App\Services\Conversations\UnreadCounts;

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Số trên chuông: số hội thoại cần người dùng để mắt — có tin chưa đọc (chấm ở
 * danh sách) hoặc còn thông báo chưa đọc của chính họ (được giao, được nhắc tên…).
 * Một hội thoại thuộc cả hai nhóm chỉ tính một lần, nên mở nó là chuông giảm đúng một.
 */
final class AttentionCounter
{
    public function __construct(
        private readonly Account $account,
        private readonly User $user,
    ) {}

    public function count(): int
    {
        $accountUser = AccountUser::query()
            ->where('account_id', $this->account->id)
            ->where('user_id', $this->user->id)
            ->first();

        if ($accountUser === null) {
            return 0;
        }

        $unread = UnreadConversations::query($this->account, $this->user, $accountUser)->select('conversations.id');
        $notified = DB::table('notifications')
            ->where('user_id', $this->user->id)
            ->where('account_id', $this->account->id)
            ->whereNull('read_at')
            ->whereNull('snoozed_until')
            ->where('primary_actor_type', (new Conversation)->getMorphClass())
            ->select('primary_actor_id AS id');

        return DB::query()->fromSub($unread->union($notified), 'attention')->count();
    }
}
