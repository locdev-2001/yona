<?php

namespace App\Services\Reports;

final readonly class ReportMetric
{
    public const AGGREGATE_COUNT = 'count';

    public const AGGREGATE_AVERAGE = 'average';

    public const STRATEGY_DISTINCT_CONVERSATION = 'distinct_conversation';

    public const STRATEGY_EXCLUDE_BOT_HANDOFFS = 'exclude_bot_handoffs';

    public function __construct(
        public string $name,
        public string $aggregate,
        public ?string $rawEventName = null,
        public ?string $rollupMetric = null,
        public ?string $summaryKey = null,
        public ?string $rawCountStrategy = null,
    ) {}

    public function isAverage(): bool
    {
        return $this->aggregate === self::AGGREGATE_AVERAGE;
    }

    public function isCount(): bool
    {
        return $this->aggregate === self::AGGREGATE_COUNT;
    }

    public function rollupSupported(): bool
    {
        return $this->rollupMetric !== null;
    }
}
