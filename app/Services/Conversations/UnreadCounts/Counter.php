<?php

namespace App\Services\Conversations\UnreadCounts;

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

// Bộ đếm badge sidebar theo inbox / nhãn / team.
//
// KHÁC BIỆT CỐ Ý: bản gốc dựng sổ thành viên trong Redis (Builder/Store/Refresher/
// Listener… 16 file) rồi cộng set; ở đây đếm thẳng bằng MỘT truy vấn SQL cho mỗi
// chiều. Cùng định nghĩa "chưa đọc", cùng shape trả về, không cần lớp cache và
// không có nguy cơ sổ lệch dữ liệu. Bỏ hẳn: FilteredCounter (mentions/participating/
// unattended/folders — E1 + B11) và permission_mode theo custom role (EE).
class Counter
{
    public function __construct(
        private readonly Account $account,
        private readonly User $user,
        private readonly AccountUser $accountUser,
    ) {}

    /** @return array{all_count: int, inboxes: array<string, int>, labels: array<string, int>, teams: array<string, int>} */
    public function perform(): array
    {
        $inboxCounts = $this->countBy('conversations.inbox_id');

        return [
            'all_count' => array_sum($inboxCounts),
            'inboxes' => $inboxCounts,
            'labels' => $this->labelCounts(),
            'teams' => $this->countBy('conversations.team_id', $this->visibleTeamIds()),
        ];
    }

    /**
     * @param  array<int, int>|null  $allowedIds
     * @return array<string, int>
     */
    private function countBy(string $column, ?array $allowedIds = null): array
    {
        $query = $this->unreadConversations()
            ->select($column.' AS group_id', DB::raw('COUNT(*) AS unread_conversations'))
            ->whereNotNull($column)
            ->groupBy($column);

        if ($allowedIds !== null) {
            $query->whereIn($column, $allowedIds);
        }

        return $this->indexByGroup($query->get());
    }

    /** @return array<string, int> */
    private function labelCounts(): array
    {
        $sidebarLabelIds = $this->account->labels()->where('show_on_sidebar', true)->pluck('id');

        if ($sidebarLabelIds->isEmpty()) {
            return [];
        }

        $rows = $this->unreadConversations()
            ->join('taggings', function ($join) {
                $join->on('taggings.taggable_id', '=', 'conversations.id')
                    ->where('taggings.taggable_type', '=', (new Conversation)->getMorphClass());
            })
            ->whereIn('taggings.label_id', $sidebarLabelIds)
            ->select('taggings.label_id AS group_id', DB::raw('COUNT(DISTINCT conversations.id) AS unread_conversations'))
            ->groupBy('taggings.label_id')
            ->get();

        return $this->indexByGroup($rows);
    }

    private function unreadConversations(): QueryBuilder
    {
        return UnreadConversations::query($this->account, $this->user, $this->accountUser);
    }

    /** @param Collection<int, object> $rows @return array<string, int> */
    private function indexByGroup($rows): array
    {
        return $rows
            ->filter(fn (object $row) => (int) $row->unread_conversations > 0)
            ->mapWithKeys(fn (object $row) => [(string) $row->group_id => (int) $row->unread_conversations])
            ->all();
    }

    /** @return array<int, int> */
    private function visibleTeamIds(): array
    {
        if ($this->accountUser->isAdministrator()) {
            return $this->account->teams()->pluck('teams.id')->all();
        }

        return $this->user->teams()->where('teams.account_id', $this->account->id)->pluck('teams.id')->all();
    }
}
