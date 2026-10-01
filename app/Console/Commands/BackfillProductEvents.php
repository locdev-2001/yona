<?php

namespace App\Console\Commands;

use App\Services\ProductEvents\ProductEventBackfill;
use Illuminate\Console\Command;

// Dựng sự kiện sản phẩm từ dữ liệu cũ. An toàn khi chạy lại: khoá chống trùng
// giống hệt sự kiện ghi trực tiếp, dòng đã có thì bỏ qua.
class BackfillProductEvents extends Command
{
    protected $signature = 'product-events:backfill
        {--account= : Chỉ dựng cho một account (ID)}';

    protected $description = 'Dựng product_events từ accounts, users, inboxes, messages và các bảng tính năng';

    public function handle(ProductEventBackfill $backfill): int
    {
        $accountId = $this->option('account');
        if (filled($accountId) && ! ctype_digit((string) $accountId)) {
            $this->error('--account phải là số.');

            return self::INVALID;
        }

        $counts = $backfill->run(filled($accountId) ? (int) $accountId : null);

        $this->table(['Sự kiện', 'Thêm mới'], collect($counts)->map(fn (int $count, string $name) => [$name, $count])->values()->all());
        $this->info('Tổng thêm mới: '.array_sum($counts));

        return self::SUCCESS;
    }
}
