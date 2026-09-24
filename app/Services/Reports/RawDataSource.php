<?php

namespace App\Services\Reports;

use App\Models\Conversation;
use App\Models\ReportingEvent;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

// Đọc thẳng từ
// bảng sự kiện thô / hội thoại / tin nhắn.
final class RawDataSource extends DataSource
{
    public function timeseries(): array
    {
        return $this->isAverageMetric() ? $this->averageTimeseries() : $this->countTimeseries();
    }

    public function aggregate(): mixed
    {
        if ($this->isAverageMetric()) {
            $average = $this->rangedQuery($this->averageScope())->avg($this->averageValueColumn());

            return $average === null ? null : (float) $average;
        }

        return $this->countScopeCount();
    }

    public function summary(): array
    {
        $metricResults = $this->summaryMetricResults();
        $conversationCounts = $this->summaryConversationCounts();
        $summary = [];

        foreach (array_unique([...array_keys($metricResults), ...array_keys($conversationCounts)]) as $dimensionId) {
            $summary[$dimensionId] = $this->summaryAttributes(
                $metricResults[$dimensionId] ?? null,
                (int) ($conversationCounts[$dimensionId] ?? 0),
            );
        }

        return $summary;
    }

    /** @return list<array{value: mixed, timestamp: int}> */
    private function countTimeseries(): array
    {
        $results = [];

        foreach ($this->grouper()->count($this->countScope(), $this->countScopeDateColumn()) as $timestamp => $value) {
            $results[] = ['value' => $value, 'timestamp' => $timestamp];
        }

        return $results;
    }

    /** @return list<array{value: mixed, timestamp: int, count: int}> */
    private function averageTimeseries(): array
    {
        $grouper = $this->grouper();
        $scope = $this->averageScope();
        $averages = $grouper->average($scope, $this->averageValueColumn());
        $counts = $grouper->count($scope);
        $results = [];

        foreach ($averages as $timestamp => $value) {
            $results[] = ['value' => $value, 'timestamp' => $timestamp, 'count' => (int) ($counts[$timestamp] ?? 0)];
        }

        return $results;
    }

    private function grouper(): TimeseriesGrouper
    {
        return new TimeseriesGrouper(
            TimeseriesGrouper::period($this->context->groupBy),
            $this->timezone(),
            $this->context->range,
        );
    }

    /** @return Builder<ReportingEvent> */
    private function averageScope(): Builder
    {
        return $this->scope()->reportingEvents()->where('reporting_events.name', $this->metric()?->rawEventName);
    }

    /** @return Builder<covariant \Illuminate\Database\Eloquent\Model> */
    private function countScope(): Builder
    {
        return match ($this->context->metric) {
            ReportMetricRegistry::CONVERSATIONS_COUNT => $this->scope()->conversations(),
            ReportMetricRegistry::INCOMING_MESSAGES_COUNT => $this->scope()->messages()->incoming(),
            ReportMetricRegistry::OUTGOING_MESSAGES_COUNT => $this->scope()->messages()->outgoing(),
            default => $this->reportingEventCountScope(),
        };
    }

    private function countScopeDateColumn(): string
    {
        return 'created_at';
    }

    private function countScopeCount(): int
    {
        $metric = $this->metric();

        if ($metric?->rawCountStrategy === ReportMetric::STRATEGY_DISTINCT_CONVERSATION) {
            return (int) $this->rangedQuery($this->reportingEventCountScope())->distinct()->count('reporting_events.conversation_id');
        }

        return (int) $this->rangedQuery($this->countScope())->count();
    }

    /** @return Builder<ReportingEvent> */
    private function reportingEventCountScope(): Builder
    {
        $metric = $this->metric();
        $events = $this->scope()->reportingEvents()->where('reporting_events.name', $metric?->rawEventName);

        if ($metric?->rawCountStrategy === ReportMetric::STRATEGY_EXCLUDE_BOT_HANDOFFS) {
            $events->whereNotIn('reporting_events.conversation_id', $this->botHandoffConversationIds());
        }

        return $events;
    }

    /** @return \Illuminate\Database\Query\Builder */
    private function botHandoffConversationIds()
    {
        $query = $this->scope()->reportingEvents()
            ->where('reporting_events.name', ReportingEvent::NAME_CONVERSATION_BOT_HANDOFF)
            ->whereNotNull('reporting_events.conversation_id');

        return $this->rangedQuery($query)->select('reporting_events.conversation_id')->toBase();
    }

    /**
     * @template TModel of \Illuminate\Database\Eloquent\Model
     *
     * @param  Builder<TModel>  $query
     * @return Builder<TModel>
     */
    private function rangedQuery(Builder $query): Builder
    {
        $range = $this->context->range;

        if ($range === null) {
            return $query;
        }

        $column = $query->getModel()->qualifyColumn('created_at');

        return $query->where($column, '>=', $range->since)->where($column, '<', $range->until);
    }

    /** @return array<int|string, object> */
    private function summaryMetricResults(): array
    {
        $groupBy = $this->summaryGroupByKey();
        $indexKey = $this->summaryIndexKey();

        $query = ReportingEvent::query()->where('reporting_events.account_id', $this->context->account->id);
        $query = $this->rangedQuery($query);

        if ($this->context->dimensionType === ReportScope::TYPE_TEAM) {
            $query->join('conversations', 'conversations.id', '=', 'reporting_events.conversation_id');
        }

        $selects = [DB::raw("{$groupBy} as {$indexKey}")];

        foreach (ReportMetricRegistry::summaryMetrics() as $definition) {
            $selects[] = DB::raw($this->summarySelectField($definition));
        }

        $rows = $query->getQuery()->select($selects)->groupBy(DB::raw($groupBy))->get();
        $results = [];

        foreach ($rows as $row) {
            $results[$row->{$indexKey}] = $row;
        }

        return $results;
    }

    private function summarySelectField(ReportMetric $definition): string
    {
        $eventName = str_replace("'", "''", (string) $definition->rawEventName);

        if ($definition->isCount()) {
            return "count(case when reporting_events.name = '{$eventName}' then 1 end) as {$definition->summaryKey}";
        }

        return "avg(case when reporting_events.name = '{$eventName}' then reporting_events.{$this->averageValueColumn()} end)"
            ." as {$definition->summaryKey}";
    }

    /** @return array<string, mixed> */
    private function summaryAttributes(?object $record, int $conversationsCount): array
    {
        $attributes = ['conversations_count' => $conversationsCount];

        foreach (ReportMetricRegistry::summaryMetrics() as $definition) {
            $value = $record?->{$definition->summaryKey} ?? null;
            $attributes[$definition->summaryKey] = $definition->isCount() ? (int) $value : ($value === null ? null : (float) $value);
        }

        return $attributes;
    }

    /** @return array<int|string, int> */
    private function summaryConversationCounts(): array
    {
        $groupBy = $this->summaryConversationGroupByKey();
        $query = $this->rangedQuery(Conversation::query()->where('conversations.account_id', $this->context->account->id));

        return $query->getQuery()
            ->select(DB::raw("{$groupBy} as dimension_id"), DB::raw('count(*) as conversations_count'))
            ->groupBy(DB::raw($groupBy))
            ->get()
            ->reduce(function (array $carry, object $row) {
                if ($row->dimension_id !== null) {
                    $carry[$row->dimension_id] = (int) $row->conversations_count;
                }

                return $carry;
            }, []);
    }

    private function summaryGroupByKey(): string
    {
        return match ($this->context->dimensionType) {
            ReportScope::TYPE_AGENT => 'reporting_events.user_id',
            ReportScope::TYPE_INBOX => 'reporting_events.inbox_id',
            ReportScope::TYPE_TEAM => 'conversations.team_id',
            default => 'reporting_events.account_id',
        };
    }

    private function summaryConversationGroupByKey(): string
    {
        return match ($this->context->dimensionType) {
            ReportScope::TYPE_AGENT => 'conversations.assignee_id',
            ReportScope::TYPE_INBOX => 'conversations.inbox_id',
            ReportScope::TYPE_TEAM => 'conversations.team_id',
            default => 'conversations.account_id',
        };
    }

    private function summaryIndexKey(): string
    {
        $groupBy = $this->summaryGroupByKey();

        return substr($groupBy, strrpos($groupBy, '.') + 1);
    }
}
