<?php

namespace App\Jobs\Labels;

use App\Jobs\ApplicationJob;
use App\Services\Labels\UpdateService;

// Bỏ tham số old_label_title: xem App\Services\Labels\UpdateService.
class UpdateJob extends ApplicationJob
{
    public function __construct(
        public readonly string $newLabelTitle,
        public readonly int $accountId,
    ) {
        $this->onQueue('default');
    }

    public function handle(): void
    {
        (new UpdateService($this->newLabelTitle, $this->accountId))->perform();
    }
}
