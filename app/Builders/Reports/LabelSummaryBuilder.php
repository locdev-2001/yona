<?php

namespace App\Builders\Reports;

use App\Models\Account;
use App\Models\Conversation;
use App\Models\Label;
use App\Models\ReportingEvent;
use App\Services\Reports\ReportRange;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Facades\DB;

/**
 * Port từ V2::Reports::LabelSummaryBuilder — nhãn không có chiều riêng trong
 * reporting_events nên mọi số đều đi qua bảng nối `taggings`.
 */
final class LabelSummaryBuilder
{
    /** @param array<string, mixed> $params */
    public function __construct(
        private readonly Account $account,
        private readonly array $params,
    ) {}

    /** @return list<array<string, mixed>> */
    public function build(): array
    {
        $labels = $this->account->labels()->get();

        if ($labels->isEmpty()) {
            return [];
        }

        $conversationCounts = $this->conversationCounts();
        $resolvedCounts = $this->resolvedCounts();
        $resolutionMetrics = $this->averageMetrics(ReportingEvent::NAME_CONVERSATION_RESOLVED);
        $firstResponseMetrics = $this->averageMetrics(ReportingEvent::NAME_FIRST_RESPONSE);
        $replyMetrics = $this->averageMetrics(ReportingEvent::NAME_REPLY_TIME);

        return $labels->map(fn (Label $label) => [
            'id' => $label->id,
            'name' => $label->title,
            'conversations_count' => (int) ($conversationCounts[$label->title] ?? 0),
            'avg_resolution_time' => $resolutionMetrics[$label->title] ?? 0,
            'avg_first_response_time' => $firstResponseMetrics[$label->title] ?? 0,
            'avg_reply_time' => $replyMetrics[$label->title] ?? 0,
            'resolved_conversations_count' => (int) ($resolvedCounts[$label->title] ?? 0),
        ])->values()->all();
    }

    /** @return array<string, int> */
    private function conversationCounts(): array
    {
        $query = $this->taggedConversations()
            ->select('labels.title as label_title', DB::raw('count(taggings.id) as label_count'))
            ->groupBy('labels.title');

        return $this->keyByLabel($query, 'label_count', fn ($value) => (int) $value);
    }

    /** @return array<string, int> */
    private function resolvedCounts(): array
    {
        // Đếm SỰ KIỆN đóng trong khoảng (lọc theo reporting_events.created_at),
        // không phải hội thoại đang ở trạng thái đóng.
        $query = $this->taggedReportingEvents(ReportingEvent::NAME_CONVERSATION_RESOLVED, filterConversationRange: false)
            ->select('labels.title as label_title', DB::raw('count(reporting_events.id) as label_count'))
            ->groupBy('labels.title');

        return $this->keyByLabel($query, 'label_count', fn ($value) => (int) $value);
    }

    /** @return array<string, float> */
    private function averageMetrics(string $eventName): array
    {
        $valueColumn = $this->useBusinessHours() ? 'value_in_business_hours' : 'value';

        $query = $this->taggedReportingEvents($eventName, filterConversationRange: true)
            ->select('labels.title as label_title', DB::raw("avg(reporting_events.{$valueColumn}) as label_count"))
            ->groupBy('labels.title')
            ->orderBy('labels.title');

        return $this->keyByLabel($query, 'label_count', fn ($value) => (float) $value);
    }

    private function taggedConversations(): QueryBuilder
    {
        $query = DB::table('taggings')
            ->join('conversations', 'taggings.taggable_id', '=', 'conversations.id')
            ->join('labels', 'taggings.label_id', '=', 'labels.id')
            ->where('taggings.taggable_type', (new Conversation)->getMorphClass())
            ->where('conversations.account_id', $this->account->id);

        return $this->applyRange($query, 'conversations.created_at');
    }

    private function taggedReportingEvents(string $eventName, bool $filterConversationRange): QueryBuilder
    {
        $query = DB::table('reporting_events')
            ->join('conversations', 'reporting_events.conversation_id', '=', 'conversations.id')
            ->join('taggings', function ($join) {
                $join->on('taggings.taggable_id', '=', 'conversations.id')
                    ->where('taggings.taggable_type', (new Conversation)->getMorphClass());
            })
            ->join('labels', 'taggings.label_id', '=', 'labels.id')
            ->where('reporting_events.name', $eventName)
            ->where('reporting_events.account_id', $this->account->id);

        if ($filterConversationRange) {
            $query->where('conversations.account_id', $this->account->id);

            return $this->applyRange($query, 'conversations.created_at');
        }

        return $this->applyRange($query, 'reporting_events.created_at');
    }

    private function applyRange(QueryBuilder $query, string $column): QueryBuilder
    {
        $range = $this->range();

        if ($range === null) {
            return $query;
        }

        return $query->where($column, '>=', $range->since)->where($column, '<', $range->until);
    }

    /** @return array<string, mixed> */
    private function keyByLabel(QueryBuilder $query, string $valueKey, callable $cast): array
    {
        $result = [];

        foreach ($query->get() as $row) {
            $result[$row->label_title] = $cast($row->{$valueKey});
        }

        return $result;
    }

    private function range(): ?ReportRange
    {
        return ReportRange::fromParams($this->params['since'] ?? null, $this->params['until'] ?? null);
    }

    private function useBusinessHours(): bool
    {
        return filter_var($this->params['business_hours'] ?? null, FILTER_VALIDATE_BOOLEAN);
    }
}
