<?php

namespace App\Console\Commands;

use App\Models\Workspace;
use App\Modules\Identity\Merge\ProfileIdentificationService;
use App\Support\TenantScope;
use Illuminate\Console\Command;

/**
 * Đối soát cờ `is_identified`.
 *
 * Cờ đó là cache suy ra từ bí danh nên nó lệch được — sau một lần backfill hỏng,
 * một lần sửa tay, hay một đợt gộp bị ngắt giữa chừng. Lệnh này là đường sửa,
 * và sự tồn tại của nó là một trong ba điều kiện cho phép cache đó tồn tại.
 */
class ReconcileIdentifiedProfiles extends Command
{
    protected $signature = 'profiles:reconcile-identified {--workspace= : Chỉ đối soát một workspace}';

    protected $description = 'Tính lại cờ is_identified của hồ sơ từ bí danh thật';

    public function handle(ProfileIdentificationService $identification): int
    {
        $workspaceIds = $this->option('workspace') !== null
            ? [(string) $this->option('workspace')]
            : Workspace::query()->pluck('id')->all();

        $total = 0;

        foreach ($workspaceIds as $workspaceId) {
            // Bảng bật RLS: không bind ngữ cảnh thì truy vấn thấy 0 hàng và lệnh
            // báo "không có gì để sửa" trong khi thực tế chưa đọc được hàng nào.
            $fixed = TenantScope::runScoped($workspaceId, fn () => $identification->reconcileWorkspace($workspaceId));
            $total += $fixed;

            if ($fixed > 0) {
                $this->line("workspace {$workspaceId}: sửa {$fixed} hồ sơ");
            }
        }

        $this->info("Đối soát xong — {$total} hồ sơ lệch đã được sửa.");

        return self::SUCCESS;
    }
}
