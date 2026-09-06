<?php

use App\Services\Reports\ReportMetric;
use App\Services\Reports\ReportMetricRegistry;
use App\Services\Reports\TimeFormatPresenter;
use App\Services\Reports\TimezoneResolver;

// Port từ spec/services/reports/report_metric_registry_spec.rb + spec/presenters.

it('describes every public report metric', function () {
    expect(array_keys(ReportMetricRegistry::all()))->toBe([
        'conversations_count',
        'incoming_messages_count',
        'outgoing_messages_count',
        'avg_first_response_time',
        'avg_resolution_time',
        'reply_time',
        'resolutions_count',
        'bot_resolutions_count',
        'bot_handoffs_count',
    ]);
});

it('reports unknown metrics as unsupported', function () {
    expect(ReportMetricRegistry::supported('nope'))->toBeFalse()
        ->and(ReportMetricRegistry::supported(null))->toBeFalse()
        ->and(ReportMetricRegistry::fetch('reply_time')->isAverage())->toBeTrue()
        ->and(ReportMetricRegistry::fetch('resolutions_count')->isCount())->toBeTrue()
        ->and(ReportMetricRegistry::fetch('conversations_count')->rollupSupported())->toBeFalse();
});

it('exposes the four summary metrics with their response keys', function () {
    expect(array_map(fn (ReportMetric $metric) => $metric->summaryKey, ReportMetricRegistry::summaryMetrics()))
        ->toBe(['resolved_conversations_count', 'avg_resolution_time', 'avg_first_response_time', 'avg_reply_time']);
});

it('formats durations with at most two units', function () {
    expect((new TimeFormatPresenter(null))->format())->toBe('N/A')
        ->and((new TimeFormatPresenter(0))->format())->toBe('N/A')
        ->and((new TimeFormatPresenter(45))->format())->toBe('45 seconds')
        ->and((new TimeFormatPresenter(60))->format())->toBe('1 minute')
        ->and((new TimeFormatPresenter(90061))->format())->toBe('1 day 1 hour');
});

it('resolves a timezone name from the browser offset', function () {
    expect(TimezoneResolver::fromOffset(null))->toBe('UTC')
        ->and(TimezoneResolver::fromOffset(7))->toBe('Asia/Bangkok')
        ->and(TimezoneResolver::label(7))->toBe('(GMT+07:00) Bangkok')
        ->and((new DateTimeZone(TimezoneResolver::fromOffset(-8)))->getOffset(new DateTimeImmutable('now', new DateTimeZone('UTC'))))->toBe(-28800);
});
