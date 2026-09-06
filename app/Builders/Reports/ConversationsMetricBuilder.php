<?php

namespace App\Builders\Reports;

use App\Models\Account;
use App\Services\Reports\ReportMetricRegistry;

// Port từ V2::Reports::Conversations::MetricBuilder — khối số tổng cho một khoảng.
final class ConversationsMetricBuilder
{
    /** @param array<string, mixed> $params */
    public function __construct(
        private readonly Account $account,
        private readonly array $params,
    ) {}

    /** @return array<string, mixed> */
    public function summary(): array
    {
        return [
            'conversations_count' => $this->value(ReportMetricRegistry::CONVERSATIONS_COUNT),
            'incoming_messages_count' => $this->value(ReportMetricRegistry::INCOMING_MESSAGES_COUNT),
            'outgoing_messages_count' => $this->value(ReportMetricRegistry::OUTGOING_MESSAGES_COUNT),
            'avg_first_response_time' => $this->value(ReportMetricRegistry::AVG_FIRST_RESPONSE_TIME),
            'avg_resolution_time' => $this->value(ReportMetricRegistry::AVG_RESOLUTION_TIME),
            'resolutions_count' => $this->value(ReportMetricRegistry::RESOLUTIONS_COUNT),
            'reply_time' => $this->value(ReportMetricRegistry::REPLY_TIME),
        ];
    }

    /** @return array<string, mixed> */
    public function botSummary(): array
    {
        return [
            'bot_resolutions_count' => $this->value(ReportMetricRegistry::BOT_RESOLUTIONS_COUNT),
            'bot_handoffs_count' => $this->value(ReportMetricRegistry::BOT_HANDOFFS_COUNT),
        ];
    }

    private function value(string $metric): mixed
    {
        return (new TimeseriesReportBuilder($this->account, array_replace($this->params, ['metric' => $metric])))
            ->aggregateValue();
    }
}
