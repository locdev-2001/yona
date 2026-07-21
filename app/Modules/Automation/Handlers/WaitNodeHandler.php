<?php

namespace App\Modules\Automation\Handlers;

use App\Models\WorkflowRun;
use App\Modules\Automation\Contracts\NodeHandler;
use App\Modules\Automation\NodeHandlerResult;

/**
 * Chờ (flow) — N phút/giờ/ngày. Engine gọi handle() đúng 1 lần khi node này
 * lần đầu thành current node (tính resumeAt); khi resume từ cron, Engine
 * KHÔNG gọi lại handler này (xem WorkflowEngine::advance()) — tránh tính lại
 * resumeAt mỗi lần resume (sẽ tạo vòng chờ vô hạn).
 */
class WaitNodeHandler implements NodeHandler
{
    public function type(): string
    {
        return 'wait';
    }

    public function handle(WorkflowRun $run, array $node): NodeHandlerResult
    {
        $amount = max(0, (int) ($node['config']['amount'] ?? 0));
        $unit = $node['config']['unit'] ?? 'minutes';

        $resumeAt = match ($unit) {
            'days' => now()->addDays($amount),
            'hours' => now()->addHours($amount),
            default => now()->addMinutes($amount),
        };

        return NodeHandlerResult::success(
            message: "waiting {$amount} {$unit}",
            resumeAt: $resumeAt,
        );
    }
}
