<?php

namespace App\Jobs\Labels;

use App\Jobs\ApplicationJob;
use App\Services\Labels\DestroyService;

// Port từ refs/chatwoot/app/jobs/labels/remove_associations_job.rb.
// Bỏ tham số label_deleted_at: bản gốc cần mốc thời gian vì tag sống độc lập
// với nhãn (một liên kết tạo sau lúc xóa vẫn tồn tại); ở đây taggings có khóa
// ngoại cascade nên không thể có liên kết mồ côi.
class RemoveAssociationsJob extends ApplicationJob
{
    public function __construct(
        public readonly string $labelTitle,
        public readonly int $accountId,
    ) {
        $this->onQueue('default');
    }

    public function handle(): void
    {
        (new DestroyService($this->labelTitle, $this->accountId))->perform();
    }
}
