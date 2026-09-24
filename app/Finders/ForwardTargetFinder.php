<?php

namespace App\Finders;

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\User;
use App\Services\SearchService;
use Illuminate\Database\Eloquent\Collection;

/**
 * Hội thoại đích cho hộp chuyển tiếp: ô tìm trống thì là các hội thoại vừa hoạt
 * động; có từ khoá thì dùng đúng ngữ nghĩa tìm hội thoại của trang Tìm kiếm (một
 * nơi duy nhất). Chỉ hộp thư user được giao, luôn bỏ hội thoại nguồn.
 */
final class ForwardTargetFinder
{
    public const RECENT_LIMIT = 20;

    public function __construct(
        private readonly User $user,
        private readonly Account $account,
        private readonly AccountUser $accountUser,
        private readonly Conversation $exclude,
    ) {}

    /** @return Collection<int, Conversation> đã nạp sẵn contact.avatar, inbox.channel */
    public function perform(string $query): Collection
    {
        $query = trim($query);
        $conversations = $query === '' ? $this->recent() : $this->search($query);

        return $conversations->load(['contact.avatar', 'inbox.channel']);
    }

    /** @return Collection<int, Conversation> */
    private function recent(): Collection
    {
        return Conversation::query()
            ->where('account_id', $this->account->id)
            ->whereIn('inbox_id', $this->user->assignedInboxes($this->account, $this->accountUser)->select('inboxes.id'))
            ->whereKeyNot($this->exclude->getKey())
            ->sortOnLastActivityAt('desc')
            ->orderByDesc('id')
            ->limit(self::RECENT_LIMIT)
            ->get();
    }

    /** @return Collection<int, Conversation> */
    private function search(string $query): Collection
    {
        return (new SearchService($this->user, $this->account, ['q' => $query], 'Conversation'))
            ->filterConversations()
            ->reject(fn (Conversation $conversation) => $conversation->is($this->exclude))
            ->values();
    }
}
