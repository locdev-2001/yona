<?php

namespace App\Services\Reports;

// Port từ refs/chatwoot/app/services/reports/report_metric_registry.rb — sổ duy
// nhất mô tả mọi chỉ số báo cáo công khai và cách lấy số cho nó.
final class ReportMetricRegistry
{
    public const CONVERSATIONS_COUNT = 'conversations_count';

    public const INCOMING_MESSAGES_COUNT = 'incoming_messages_count';

    public const OUTGOING_MESSAGES_COUNT = 'outgoing_messages_count';

    public const AVG_FIRST_RESPONSE_TIME = 'avg_first_response_time';

    public const AVG_RESOLUTION_TIME = 'avg_resolution_time';

    public const REPLY_TIME = 'reply_time';

    public const RESOLUTIONS_COUNT = 'resolutions_count';

    public const BOT_RESOLUTIONS_COUNT = 'bot_resolutions_count';

    public const BOT_HANDOFFS_COUNT = 'bot_handoffs_count';

    private const SUMMARY_METRIC_NAMES = [
        self::RESOLUTIONS_COUNT,
        self::AVG_RESOLUTION_TIME,
        self::AVG_FIRST_RESPONSE_TIME,
        self::REPLY_TIME,
    ];

    /** @return array<string, ReportMetric> */
    public static function all(): array
    {
        static $metrics = null;

        return $metrics ??= [
            self::CONVERSATIONS_COUNT => new ReportMetric(
                name: self::CONVERSATIONS_COUNT,
                aggregate: ReportMetric::AGGREGATE_COUNT,
            ),
            self::INCOMING_MESSAGES_COUNT => new ReportMetric(
                name: self::INCOMING_MESSAGES_COUNT,
                aggregate: ReportMetric::AGGREGATE_COUNT,
            ),
            self::OUTGOING_MESSAGES_COUNT => new ReportMetric(
                name: self::OUTGOING_MESSAGES_COUNT,
                aggregate: ReportMetric::AGGREGATE_COUNT,
            ),
            self::AVG_FIRST_RESPONSE_TIME => new ReportMetric(
                name: self::AVG_FIRST_RESPONSE_TIME,
                aggregate: ReportMetric::AGGREGATE_AVERAGE,
                rawEventName: 'first_response',
                rollupMetric: 'first_response',
                summaryKey: 'avg_first_response_time',
            ),
            self::AVG_RESOLUTION_TIME => new ReportMetric(
                name: self::AVG_RESOLUTION_TIME,
                aggregate: ReportMetric::AGGREGATE_AVERAGE,
                rawEventName: 'conversation_resolved',
                rollupMetric: 'resolution_time',
                summaryKey: 'avg_resolution_time',
            ),
            self::REPLY_TIME => new ReportMetric(
                name: self::REPLY_TIME,
                aggregate: ReportMetric::AGGREGATE_AVERAGE,
                rawEventName: 'reply_time',
                rollupMetric: 'reply_time',
                summaryKey: 'avg_reply_time',
            ),
            self::RESOLUTIONS_COUNT => new ReportMetric(
                name: self::RESOLUTIONS_COUNT,
                aggregate: ReportMetric::AGGREGATE_COUNT,
                rawEventName: 'conversation_resolved',
                rollupMetric: 'resolutions_count',
                summaryKey: 'resolved_conversations_count',
            ),
            self::BOT_RESOLUTIONS_COUNT => new ReportMetric(
                name: self::BOT_RESOLUTIONS_COUNT,
                aggregate: ReportMetric::AGGREGATE_COUNT,
                rawEventName: 'conversation_bot_resolved',
                rollupMetric: 'bot_resolutions_count',
                rawCountStrategy: ReportMetric::STRATEGY_EXCLUDE_BOT_HANDOFFS,
            ),
            self::BOT_HANDOFFS_COUNT => new ReportMetric(
                name: self::BOT_HANDOFFS_COUNT,
                aggregate: ReportMetric::AGGREGATE_COUNT,
                rawEventName: 'conversation_bot_handoff',
                rollupMetric: 'bot_handoffs_count',
                rawCountStrategy: ReportMetric::STRATEGY_DISTINCT_CONVERSATION,
            ),
        ];
    }

    public static function fetch(?string $name): ?ReportMetric
    {
        return blank($name) ? null : (self::all()[$name] ?? null);
    }

    public static function supported(?string $name): bool
    {
        return self::fetch($name) !== null;
    }

    public static function rollupSupported(?string $name): bool
    {
        return self::fetch($name)?->rollupSupported() ?? false;
    }

    /** @return list<ReportMetric> */
    public static function summaryMetrics(): array
    {
        return array_map(fn (string $name) => self::all()[$name], self::SUMMARY_METRIC_NAMES);
    }
}
