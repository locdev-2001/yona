<?php

namespace App\Agent\Evals;

// Shop mẫu đã dựng trong DB: các id bộ chấm cần để mở hội thoại và đọc kết quả.
final readonly class EvalShop
{
    public function __construct(
        public int $accountId,
        public int $inboxId,
        public int $aiAgentId,
        public int $adminUserId,
    ) {}
}
