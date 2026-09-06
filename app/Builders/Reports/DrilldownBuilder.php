<?php

namespace App\Builders\Reports;

use App\Models\Account;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\ReportingEvent;
use App\Services\Reports\ReportMetric;
use App\Services\Reports\ReportMetricRegistry;
use App\Services\Reports\ReportScope;
use App\Services\Reports\TimezoneResolver;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * Port từ V2::Reports::DrilldownBuilder — bấm vào một cột biểu đồ thì liệt kê
 * đúng những bản ghi đã tạo ra con số đó.
 */
final class DrilldownBuilder
{
    public const DEFAULT_GROUP_BY = 'day';

    public const SUPPORTED_GROUP_BY = ['hour', 'day', 'week', 'month', 'year'];

    public const DEFAULT_PAGE = 1;

    public const DEFAULT_PER_PAGE = 25;

    public const MAX_PER_PAGE = 100;

    public const MESSAGE_METRICS = [
        ReportMetricRegistry::INCOMING_MESSAGES_COUNT => 'incoming',
        ReportMetricRegistry::OUTGOING_MESSAGES_COUNT => 'outgoing',
    ];

    public const MESSAGE_EVENT_METRICS = [
        ReportMetricRegistry::AVG_FIRST_RESPONSE_TIME,
        ReportMetricRegistry::REPLY_TIME,
    ];

    /** @var list<Model>|null */
    private ?array $records = null;

    private ?ReportScope $scope = null;

    /** @param array<string, mixed> $params */
    public function __construct(
        private readonly Account $account,
        private readonly array $params,
    ) {}

    public static function supportedDimensionType(mixed $type): bool
    {
        return in_array(blank($type) ? ReportScope::TYPE_ACCOUNT : (string) $type, ReportScope::TYPES, true);
    }

    public static function groupBy(mixed $groupBy): string
    {
        return in_array((string) $groupBy, self::SUPPORTED_GROUP_BY, true) ? (string) $groupBy : self::DEFAULT_GROUP_BY;
    }

    public static function bucketEnd(CarbonImmutable $start, string $groupBy): CarbonImmutable
    {
        return match ($groupBy) {
            'hour' => $start->addHour(),
            'week' => $start->addWeek(),
            'month' => $start->addMonth(),
            'year' => $start->addYear(),
            default => $start->addDay(),
        };
    }

    /** @return array<string, mixed> */
    public function build(): array
    {
        $records = $this->paginatedRecords();
        $serializer = new DrilldownRecordSerializer($this->account, $this->metricName(), $this->useBusinessHours(), $records);

        return [
            'meta' => $this->meta($records),
            'payload' => array_map(fn ($record) => $serializer->serialize($record), $records),
        ];
    }

    /**
     * @param  list<Model>  $records
     * @return array<string, mixed>
     */
    private function meta(array $records): array
    {
        [$bucketStart, $bucketEnd] = $this->bucketRange();

        return [
            'metric' => $this->metricName(),
            'record_type' => $this->recordType(),
            'bucket' => ['since' => $bucketStart->getTimestamp(), 'until' => $bucketEnd->getTimestamp()],
            'current_page' => $this->currentPage(),
            'per_page' => $this->perPage(),
            'total_count' => $this->totalCount(),
            'conversation_count' => $this->conversationCount(),
        ];
    }

    private function totalCount(): int
    {
        return (int) $this->drilldownScope()->reorder()->count();
    }

    private function conversationCount(): int
    {
        if ($this->isConversationMetric()) {
            return $this->totalCount();
        }

        $query = $this->drilldownScope()->reorder()->applyScopes()->getQuery();

        return (int) $query->distinct()->count('conversation_id');
    }

    /** @return list<Model> */
    private function paginatedRecords(): array
    {
        return $this->records ??= $this->drilldownScope()
            ->forPage($this->currentPage(), $this->perPage())
            ->get()
            ->all();
    }

    /** @return Builder<covariant \Illuminate\Database\Eloquent\Model> */
    private function drilldownScope(): Builder
    {
        if ($this->isMessageMetric()) {
            return $this->messageScope();
        }

        if ($this->isConversationMetric()) {
            return $this->conversationScope();
        }

        return $this->reportingEventScope();
    }

    /** @return Builder<Message> */
    private function messageScope(): Builder
    {
        $direction = self::MESSAGE_METRICS[$this->metricName()];

        return $this->applyBucketRange($this->scope()->messages(), 'messages.created_at')
            ->{$direction}()
            ->with(['sender', 'conversation.assignee', 'conversation.contact', 'conversation.inbox'])
            ->reorder('messages.created_at', 'desc');
    }

    /** @return Builder<Conversation> */
    private function conversationScope(): Builder
    {
        return $this->applyBucketRange($this->scope()->conversations(), 'conversations.created_at')
            ->with(['assignee', 'contact', 'inbox'])
            ->reorder('conversations.created_at', 'desc');
    }

    /** @return Builder<ReportingEvent> */
    private function reportingEventScope(): Builder
    {
        $events = $this->applyBucketRange($this->scope()->reportingEvents(), 'reporting_events.created_at')
            ->where('reporting_events.name', $this->metric()?->rawEventName)
            ->with(['user', 'inbox', 'conversation.assignee', 'conversation.contact', 'conversation.inbox'])
            ->reorder('reporting_events.created_at', 'desc');

        $strategy = $this->metric()?->rawCountStrategy;

        if ($strategy === ReportMetric::STRATEGY_EXCLUDE_BOT_HANDOFFS) {
            $events->whereNotIn('reporting_events.conversation_id', $this->botHandoffConversationIds());
        } elseif ($strategy === ReportMetric::STRATEGY_DISTINCT_CONVERSATION) {
            $events->whereIn('reporting_events.id', $this->distinctConversationEventIds());
        }

        return $events;
    }

    /** @return \Illuminate\Database\Query\Builder */
    private function botHandoffConversationIds()
    {
        $query = $this->scope()->reportingEvents()
            ->where('reporting_events.name', ReportingEvent::NAME_CONVERSATION_BOT_HANDOFF)
            ->whereNotNull('reporting_events.conversation_id');

        [$since, $until] = $this->requestedRange();

        return $query->where('reporting_events.created_at', '>=', $since)
            ->where('reporting_events.created_at', '<', $until)
            ->select('reporting_events.conversation_id')
            ->toBase();
    }

    /** @return \Illuminate\Database\Query\Builder */
    private function distinctConversationEventIds()
    {
        $query = $this->applyBucketRange($this->scope()->reportingEvents(), 'reporting_events.created_at')
            ->where('reporting_events.name', $this->metric()?->rawEventName)
            ->whereNotNull('reporting_events.conversation_id')
            ->getQuery();

        $query->orders = null;

        return $query->select(DB::raw('max(reporting_events.id) as id'))->groupBy('reporting_events.conversation_id');
    }

    /**
     * @template TModel of \Illuminate\Database\Eloquent\Model
     *
     * @param  Builder<TModel>  $query
     * @return Builder<TModel>
     */
    private function applyBucketRange(Builder $query, string $column): Builder
    {
        [$start, $end] = $this->bucketRange();

        return $query->where($column, '>=', $start)->where($column, '<', $end);
    }

    /** @return array{0: CarbonImmutable, 1: CarbonImmutable} */
    private function bucketRange(): array
    {
        $timezone = TimezoneResolver::fromOffset($this->params['timezone_offset'] ?? null);
        $bucketStart = CarbonImmutable::createFromTimestampUTC((int) ($this->params['bucket_timestamp'] ?? 0))->setTimezone($timezone);
        $bucketEnd = self::bucketEnd($bucketStart, self::groupBy($this->params['group_by'] ?? null));
        [$requestedStart, $requestedEnd] = $this->requestedRange();

        return [
            $bucketStart->greaterThan($requestedStart) ? $bucketStart : $requestedStart,
            $bucketEnd->lessThan($requestedEnd) ? $bucketEnd : $requestedEnd,
        ];
    }

    /** @return array{0: CarbonImmutable, 1: CarbonImmutable} */
    private function requestedRange(): array
    {
        return [
            CarbonImmutable::createFromTimestampUTC((int) ($this->params['since'] ?? 0)),
            CarbonImmutable::createFromTimestampUTC((int) ($this->params['until'] ?? 0)),
        ];
    }

    private function scope(): ReportScope
    {
        return $this->scope ??= ReportScope::for($this->account, $this->params['type'] ?? null, $this->params['id'] ?? null);
    }

    private function metricName(): string
    {
        return (string) ($this->params['metric'] ?? '');
    }

    private function metric(): ?ReportMetric
    {
        return ReportMetricRegistry::fetch($this->metricName());
    }

    private function recordType(): string
    {
        return $this->isMessageMetric() || in_array($this->metricName(), self::MESSAGE_EVENT_METRICS, true)
            ? 'message'
            : 'conversation';
    }

    private function isMessageMetric(): bool
    {
        return array_key_exists($this->metricName(), self::MESSAGE_METRICS);
    }

    private function isConversationMetric(): bool
    {
        return $this->metricName() === ReportMetricRegistry::CONVERSATIONS_COUNT;
    }

    private function currentPage(): int
    {
        return max((int) ($this->params['page'] ?? 0), self::DEFAULT_PAGE);
    }

    private function perPage(): int
    {
        $requested = (int) ($this->params['per_page'] ?? 0);

        return min($requested <= 0 ? self::DEFAULT_PER_PAGE : $requested, self::MAX_PER_PAGE);
    }

    private function useBusinessHours(): bool
    {
        return filter_var($this->params['business_hours'] ?? null, FILTER_VALIDATE_BOOLEAN);
    }
}
