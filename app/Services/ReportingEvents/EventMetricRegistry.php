<?php

namespace App\Services\ReportingEvents;

use App\Models\ReportingEvent;

/**
 * Bản gốc có hai sổ trùng nội dung (EventMetricRegistry.EVENTS và
 * MetricRegistry.EVENT_METRICS, kèm TODO tách sổ); ở đây chỉ giữ một sổ — nơi
 * duy nhất khai báo "một sự kiện thô sinh ra những dòng rollup nào".
 */
final class EventMetricRegistry
{
    private const PAYLOAD_COUNT = 'count';

    private const PAYLOAD_DURATION = 'duration';

    /** @var array<string, array<string, string>> tên sự kiện → [chỉ số rollup => kiểu payload] */
    private const EVENTS = [
        ReportingEvent::NAME_CONVERSATION_RESOLVED => [
            'resolutions_count' => self::PAYLOAD_COUNT,
            'resolution_time' => self::PAYLOAD_DURATION,
        ],
        ReportingEvent::NAME_FIRST_RESPONSE => [
            'first_response' => self::PAYLOAD_DURATION,
        ],
        ReportingEvent::NAME_REPLY_TIME => [
            'reply_time' => self::PAYLOAD_DURATION,
        ],
        ReportingEvent::NAME_CONVERSATION_BOT_RESOLVED => [
            'bot_resolutions_count' => self::PAYLOAD_COUNT,
        ],
        ReportingEvent::NAME_CONVERSATION_BOT_HANDOFF => [
            'bot_handoffs_count' => self::PAYLOAD_COUNT,
        ],
    ];

    /** @return list<string> */
    public static function eventNames(): array
    {
        return array_keys(self::EVENTS);
    }

    /** @return array<string, array{count: int, sum_value: float, sum_value_business_hours: float}> */
    public static function metricsFor(?ReportingEvent $event): array
    {
        if ($event === null) {
            return [];
        }

        return self::metricsForAggregate(
            (string) $event->name,
            1,
            (float) $event->value,
            (float) $event->value_in_business_hours,
        );
    }

    /** @return array<string, array{count: int, sum_value: float, sum_value_business_hours: float}> */
    public static function metricsForAggregate(
        ?string $eventName,
        int $count,
        float $sumValue,
        float $sumValueBusinessHours,
    ): array {
        if (blank($eventName)) {
            return [];
        }

        $metrics = [];

        foreach (self::EVENTS[$eventName] ?? [] as $rollupMetric => $payloadKind) {
            $metrics[$rollupMetric] = $payloadKind === self::PAYLOAD_COUNT
                ? ['count' => $count, 'sum_value' => 0.0, 'sum_value_business_hours' => 0.0]
                : ['count' => $count, 'sum_value' => $sumValue, 'sum_value_business_hours' => $sumValueBusinessHours];
        }

        return $metrics;
    }
}
