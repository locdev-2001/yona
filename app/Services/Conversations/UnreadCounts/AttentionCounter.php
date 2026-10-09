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
        return array_sum($this->countByInbox());
    }

    /**
     * Số trên chuông kèm phần chia theo kênh, cùng một lần đếm nên tổng các kênh luôn
     * bằng số trên chuông. Mọi nơi gửi số này cho giao diện (API, realtime) dùng chung.
     *
     * @return array{unread_count: int, unread_inbox_counts: object}
     */
    public function payload(): array
    {
        $byInbox = $this->countByInbox();

        return [
            'unread_count' => array_sum($byInbox),
            'unread_inbox_counts' => (object) $byInbox,
        ];
    }

    /** @return array<string, int> id kênh => số hội thoại cần để mắt, chỉ kênh có số > 0 */
    public function countByInbox(): array
    {
        $accountUser = AccountUser::query()
            ->where('account_id', $this->account->id)
            ->where('user_id', $this->user->id)
            ->first();

        if ($accountUser === null) {
            return [];
        }

        $unread = UnreadConversations::query($this->account, $this->user, $accountUser)->select('conversations.id');
        $notified = DB::table('notifications')
            ->where('user_id', $this->user->id)
            ->where('account_id', $this->account->id)
            ->whereNull('read_at')
            ->whereNull('snoozed_until')
            ->where('primary_actor_type', (new Conversation)->getMorphClass())
            ->select('primary_actor_id AS id');

        return DB::query()
            ->fromSub($unread->union($notified), 'attention')
            ->join('conversations', 'conversations.id', '=', 'attention.id')
            ->groupBy('conversations.inbox_id')
            ->select('conversations.inbox_id', DB::raw('COUNT(*) AS attention_count'))
            ->pluck('attention_count', 'inbox_id')
            ->mapWithKeys(fn ($attentionCount, $inboxId) => [(string) $inboxId => (int) $attentionCount])
            ->all();
    }
}
