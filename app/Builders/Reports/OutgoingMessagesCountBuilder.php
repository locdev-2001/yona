<?php

namespace App\Builders\Reports;

use App\Models\Account;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\Reports\ReportRange;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

// Port từ V2::Reports::OutgoingMessagesCountBuilder — số tin gửi đi gom theo agent,
// team, inbox hoặc nhãn.
final class OutgoingMessagesCountBuilder
{
    public const ALLOWED_GROUP_BY = ['agent', 'team', 'inbox', 'label'];

    /** @param array<string, mixed> $params */
    public function __construct(
        private readonly Account $account,
        private readonly array $params,
    ) {}

    /** @return list<array<string, mixed>> */
    public function build(): array
    {
        return match ((string) ($this->params['group_by'] ?? '')) {
            'agent' => $this->byAgent(),
            'team' => $this->byTeam(),
            'inbox' => $this->byInbox(),
            'label' => $this->byLabel(),
            default => [],
        };
    }

    /** @return list<array<string, mixed>> */
    private function byAgent(): array
    {
        $counts = $this->groupedCounts(
            $this->baseMessages()->where('messages.sender_type', 'User')->whereNotNull('messages.sender_id'),
            'messages.sender_id',
        );

        $names = $this->account->users()->whereIn('users.id', array_keys($counts))->pluck('name', 'users.id');

        return $this->rows($counts, fn ($id) => $names[$id] ?? null);
    }

    /** @return list<array<string, mixed>> */
    private function byTeam(): array
    {
        $counts = $this->groupedCounts(
            $this->baseMessages()
                ->join('conversations', 'messages.conversation_id', '=', 'conversations.id')
                ->whereNotNull('conversations.team_id'),
            'conversations.team_id',
        );

        $names = $this->account->teams()->whereIn('id', array_keys($counts))->pluck('name', 'id');

        return $this->rows($counts, fn ($id) => $names[$id] ?? null);
    }

    /** @return list<array<string, mixed>> */
    private function byInbox(): array
    {
        $counts = $this->groupedCounts($this->baseMessages(), 'messages.inbox_id');

        $names = $this->account->inboxes()->whereIn('id', array_keys($counts))->pluck('name', 'id');

        return $this->rows($counts, fn ($id) => $names[$id] ?? null);
    }

    /** @return list<array<string, mixed>> */
    private function byLabel(): array
    {
        $counts = $this->groupedCounts(
            $this->baseMessages()
                ->join('conversations', 'messages.conversation_id', '=', 'conversations.id')
                ->join('taggings', function ($join) {
                    $join->on('taggings.taggable_id', '=', 'conversations.id')
                        ->where('taggings.taggable_type', (new Conversation)->getMorphClass());
                })
                ->join('labels', 'labels.id', '=', 'taggings.label_id'),
            'labels.title',
        );

        $labelIds = $this->account->labels()->whereIn('title', array_keys($counts))->pluck('id', 'title');

        $rows = [];

        foreach ($counts as $title => $count) {
            $rows[] = ['id' => $labelIds[$title] ?? null, 'name' => $title, 'outgoing_messages_count' => $count];
        }

        return $rows;
    }

    /** @return Builder<Message> */
    private function baseMessages(): Builder
    {
        $query = Message::query()->where('messages.account_id', $this->account->id)->outgoing();
        $range = ReportRange::fromParams($this->params['since'] ?? null, $this->params['until'] ?? null);

        if ($range !== null) {
            $query->where('messages.created_at', '>=', $range->since)->where('messages.created_at', '<', $range->until);
        }

        return $query;
    }

    /**
     * @param  Builder<Message>  $query
     * @return array<int|string, int>
     */
    private function groupedCounts(Builder $query, string $groupColumn): array
    {
        $base = $query->applyScopes()->getQuery();
        $base->orders = null;

        $counts = [];

        foreach ($base->select(DB::raw("{$groupColumn} as group_key"), DB::raw('count(*) as messages_count'))->groupBy(DB::raw($groupColumn))->get() as $row) {
            $counts[$row->group_key] = (int) $row->messages_count;
        }

        return $counts;
    }

    /**
     * @param  array<int|string, int>  $counts
     * @return list<array<string, mixed>>
     */
    private function rows(array $counts, callable $nameFor): array
    {
        $rows = [];

        foreach ($counts as $id => $count) {
            $rows[] = ['id' => (int) $id, 'name' => $nameFor($id), 'outgoing_messages_count' => $count];
        }

        return $rows;
    }
}
