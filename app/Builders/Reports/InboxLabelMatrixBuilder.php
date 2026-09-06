<?php

namespace App\Builders\Reports;

use App\Models\Account;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Label;
use App\Services\Reports\ReportRange;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

// Port từ V2::Reports::InboxLabelMatrixBuilder — ma trận số hội thoại inbox × nhãn.
final class InboxLabelMatrixBuilder
{
    /** @param array<string, mixed> $params */
    public function __construct(
        private readonly Account $account,
        private readonly array $params,
    ) {}

    /** @return array<string, mixed> */
    public function build(): array
    {
        $inboxes = $this->filteredInboxes();
        $labels = $this->filteredLabels();
        $counts = $this->groupedCounts($labels);

        return [
            'inboxes' => $inboxes->map(fn (Inbox $inbox) => ['id' => $inbox->id, 'name' => $inbox->name])->values()->all(),
            'labels' => $labels->map(fn (Label $label) => ['id' => $label->id, 'title' => $label->title])->values()->all(),
            'matrix' => $inboxes->map(fn (Inbox $inbox) => $labels
                ->map(fn (Label $label) => $counts[$inbox->id.'|'.$label->title] ?? 0)
                ->values()
                ->all()
            )->values()->all(),
        ];
    }

    /** @return Collection<int, Inbox> */
    private function filteredInboxes()
    {
        return $this->account->inboxes()
            ->when(filled($this->params['inbox_ids'] ?? null), fn ($query) => $query->whereIn('id', (array) $this->params['inbox_ids']))
            ->orderBy('name')
            ->get();
    }

    /** @return Collection<int, Label> */
    private function filteredLabels()
    {
        return $this->account->labels()
            ->when(filled($this->params['label_ids'] ?? null), fn ($query) => $query->whereIn('id', (array) $this->params['label_ids']))
            ->orderBy('title')
            ->get();
    }

    /**
     * @param  Collection<int, Label>  $labels
     * @return array<string, int>
     */
    private function groupedCounts($labels): array
    {
        if ($labels->isEmpty()) {
            return [];
        }

        $query = DB::table('taggings')
            ->join('conversations', 'taggings.taggable_id', '=', 'conversations.id')
            ->join('labels', 'taggings.label_id', '=', 'labels.id')
            ->where('taggings.taggable_type', (new Conversation)->getMorphClass())
            ->where('conversations.account_id', $this->account->id)
            ->whereIn('labels.title', $labels->pluck('title')->all())
            ->select('conversations.inbox_id', 'labels.title as label_title', DB::raw('count(*) as conversations_count'))
            ->groupBy('conversations.inbox_id', 'labels.title');

        if (filled($this->params['inbox_ids'] ?? null)) {
            $query->whereIn('conversations.inbox_id', (array) $this->params['inbox_ids']);
        }

        $range = ReportRange::fromParams($this->params['since'] ?? null, $this->params['until'] ?? null);

        if ($range !== null) {
            $query->where('conversations.created_at', '>=', $range->since)
                ->where('conversations.created_at', '<', $range->until);
        }

        $counts = [];

        foreach ($query->get() as $row) {
            $counts[$row->inbox_id.'|'.$row->label_title] = (int) $row->conversations_count;
        }

        return $counts;
    }
}
