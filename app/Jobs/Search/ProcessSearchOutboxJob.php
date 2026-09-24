<?php

namespace App\Jobs\Search;

use App\Jobs\ApplicationJob;
use App\Search\SearchOutbox;
use Illuminate\Contracts\Queue\ShouldBeUniqueUntilProcessing;
use Illuminate\Queue\Middleware\WithoutOverlapping;
use Illuminate\Support\Facades\DB;

/**
 * Đẩy outbox sang engine tìm kiếm theo lô, ở tầng low để không tranh chỗ với job
 * realtime. Engine lỗi thì job thử lại; dòng outbox vẫn nằm đó nên luồng ghi tin
 * không bao giờ phải chờ hay hỏng vì engine.
 */
final class ProcessSearchOutboxJob extends ApplicationJob implements ShouldBeUniqueUntilProcessing
{
    public const BATCH_SIZE = 500;

    // Giới hạn một lượt chạy để job không giữ worker quá lâu; còn tồn thì xếp lượt sau.
    private const MAX_BATCHES_PER_RUN = 20;

    public int $tries = 5;

    // Khoá chống xếp trùng tự hết hạn: transaction ghi tin rollback sau khi đã
    // giữ khoá thì job kế tiếp vẫn xếp được.
    public int $uniqueFor = 60;

    /** @var list<int> */
    public array $backoff = [10, 30, 60, 120];

    public function __construct()
    {
        $this->onQueue('low');
    }

    // Xếp sau commit (rollback thì thôi); tạo, sửa tin liên tục chỉ giữ một job
    // chờ. Lỗi xếp hàng (Redis) không được làm hỏng lượt ghi đã commit — lịch chạy
    // mỗi phút sẽ vét phần còn lại.
    public static function dispatchSoon(): void
    {
        DB::afterCommit(function () {
            rescue(function () {
                self::dispatch();
            });
        });
    }

    /** @return list<object> */
    public function middleware(): array
    {
        return [(new WithoutOverlapping('search-outbox'))->releaseAfter(30)->expireAfter(600)];
    }

    public function handle(SearchOutbox $outbox): void
    {
        if (! $outbox->enabled()) {
            $outbox->discardPending();

            return;
        }

        for ($batch = 0; $batch < self::MAX_BATCHES_PER_RUN; $batch++) {
            if ($outbox->processBatch(self::BATCH_SIZE) < self::BATCH_SIZE) {
                return;
            }
        }

        self::dispatchSoon();
    }
}
