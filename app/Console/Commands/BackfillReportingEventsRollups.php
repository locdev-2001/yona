<?php

namespace App\Console\Commands;

use App\Models\Account;
use App\Services\ReportingEvents\BackfillService;
use App\Services\ReportingEvents\RollupService;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

/**
 * Port từ lib/tasks/reporting_events_rollup.rake — dựng lại bảng tổng hợp từ sự
 * kiện thô. Bản gốc hỏi đáp qua STDIN; ở đây là tham số dòng lệnh để chạy được
 * trong CI/cron.
 */
class BackfillReportingEventsRollups extends Command
{
    protected $signature = 'reporting-events:backfill
        {--account= : ID account cần dựng lại (bỏ trống = mọi account có reporting_timezone)}
        {--since= : Ngày bắt đầu YYYY-MM-DD (mặc định: ngày của sự kiện đầu tiên)}
        {--until= : Ngày kết thúc YYYY-MM-DD (mặc định: hôm qua theo múi giờ báo cáo)}
        {--dry-run : Chỉ in kế hoạch, không ghi}';

    protected $description = 'Dựng lại reporting_events_rollups từ reporting_events';

    public function handle(): int
    {
        foreach ($this->accounts() as $account) {
            $this->backfillAccount($account);
        }

        return self::SUCCESS;
    }

    /** @return iterable<Account> */
    private function accounts(): iterable
    {
        $accountId = $this->option('account');

        if (filled($accountId)) {
            $account = Account::find($accountId);

            if ($account === null) {
                $this->error("Không tìm thấy account {$accountId}");

                return [];
            }

            return [$account];
        }

        return Account::all()->filter(fn (Account $account) => RollupService::rollupEnabled($account));
    }

    private function backfillAccount(Account $account): void
    {
        if (! RollupService::rollupEnabled($account)) {
            $this->error("Account {$account->id} chưa đặt reporting_timezone hợp lệ");

            return;
        }

        $timezone = (string) $account->reportingTimezone();
        [$start, $end] = $this->dateRange($account, $timezone);

        if ($start === null || $end === null || $start->greaterThan($end)) {
            $this->line("Account {$account->id}: không có ngày nào cần dựng lại");

            return;
        }

        $this->line("Account {$account->id} ({$timezone}): {$start->toDateString()} → {$end->toDateString()}");

        if ($this->option('dry-run')) {
            return;
        }

        for ($date = $start; $date->lessThanOrEqualTo($end); $date = $date->addDay()) {
            BackfillService::backfillDate($account, $date->toDateString());
        }
    }

    /** @return array{0: ?CarbonImmutable, 1: ?CarbonImmutable} */
    private function dateRange(Account $account, string $timezone): array
    {
        $firstEvent = $account->reportingEvents()->orderBy('created_at')->first();

        if ($firstEvent === null) {
            return [null, null];
        }

        $since = filled($this->option('since'))
            ? CarbonImmutable::parse((string) $this->option('since'), $timezone)->startOfDay()
            : CarbonImmutable::parse($firstEvent->created_at)->setTimezone($timezone)->startOfDay();

        // Bỏ ngày hôm nay: ngày chưa đóng vẫn còn sự kiện chảy vào.
        $defaultUntil = CarbonImmutable::now($timezone)->startOfDay()->subDay();
        $until = filled($this->option('until'))
            ? CarbonImmutable::parse((string) $this->option('until'), $timezone)->startOfDay()
            : $defaultUntil;

        return [$since, $until];
    }
}
