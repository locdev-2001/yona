<?php

namespace App\Console\Commands;

use App\Services\Admin\Alerts\AlertEvaluator;
use Illuminate\Console\Command;

// Đánh giá luật cảnh báo của console quản trị (/admin/alerts) — lịch ở routes/console.php.
class EvaluateAlerts extends Command
{
    protected $signature = 'alerts:evaluate';

    protected $description = 'Đánh giá luật cảnh báo vận hành, mở/đóng sự cố và báo super admin';

    public function handle(AlertEvaluator $evaluator): int
    {
        foreach ($evaluator->evaluate() as $result) {
            $this->line(sprintf('%s: %s (%s)', $result['key'], $result['status'], $result['value'] ?? '-'));
        }

        return self::SUCCESS;
    }
}
