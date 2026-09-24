<?php

namespace App\Services\ReportingEvents;

use App\Models\Account;
use App\Models\ReportingEvent;
use App\Models\ReportingEventsRollup;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

// Mỗi sự kiện thô cộng dồn vào các dòng tổng hợp theo (ngày × chiều × chỉ số).
final class RollupService
{
    public function __construct(private readonly ReportingEvent $reportingEvent) {}

    public static function perform(ReportingEvent $reportingEvent): void
    {
        (new self($reportingEvent))->run();
    }

    public function run(): void
    {
        $account = $this->reportingEvent->account;

        if ($account === null || ! self::rollupEnabled($account)) {
            return;
        }

        $rows = $this->buildRows($account);

        if ($rows === []) {
            return;
        }

        $this->upsert($rows);
    }

    public static function rollupEnabled(Account $account): bool
    {
        $timezone = $account->reportingTimezone();

        return $timezone !== null && in_array($timezone, timezone_identifiers_list(), true);
    }

    /** @return list<array<string, mixed>> */
    private function buildRows(Account $account): array
    {
        $eventDate = Carbon::parse($this->reportingEvent->created_at)
            ->setTimezone((string) $account->reportingTimezone())
            ->toDateString();

        $dimensions = [
            ReportingEventsRollup::DIMENSION_ACCOUNT => $account->id,
            ReportingEventsRollup::DIMENSION_AGENT => $this->reportingEvent->user_id,
            ReportingEventsRollup::DIMENSION_INBOX => $this->reportingEvent->inbox_id,
        ];

        $now = now();
        $rows = [];

        foreach ($dimensions as $dimensionType => $dimensionId) {
            if ($dimensionId === null) {
                continue;
            }

            foreach (EventMetricRegistry::metricsFor($this->reportingEvent) as $metric => $values) {
                $rows[] = [
                    'account_id' => $account->id,
                    'date' => $eventDate,
                    'dimension_type' => $dimensionType,
                    'dimension_id' => $dimensionId,
                    'metric' => $metric,
                    'count' => $values['count'],
                    'sum_value' => $values['sum_value'],
                    'sum_value_business_hours' => $values['sum_value_business_hours'],
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        return $rows;
    }

    /** @param list<array<string, mixed>> $rows */
    private function upsert(array $rows): void
    {
        $table = (new ReportingEventsRollup)->getTable();
        $uniqueBy = implode(', ', ReportingEventsRollup::UNIQUE_KEY);
        $columns = implode(', ', array_keys($rows[0]));
        $placeholders = implode(', ', array_fill(0, count($rows), '('.implode(', ', array_fill(0, count($rows[0]), '?')).')'));

        $bindings = [];

        foreach ($rows as $row) {
            foreach ($row as $value) {
                $bindings[] = $value;
            }
        }

        DB::statement(
            "insert into {$table} ({$columns}) values {$placeholders}"
            ." on conflict ({$uniqueBy}) do update set"
            ." count = {$table}.count + excluded.count,"
            ." sum_value = {$table}.sum_value + excluded.sum_value,"
            ." sum_value_business_hours = {$table}.sum_value_business_hours + excluded.sum_value_business_hours,"
            .' updated_at = excluded.updated_at',
            $bindings,
        );
    }
}
