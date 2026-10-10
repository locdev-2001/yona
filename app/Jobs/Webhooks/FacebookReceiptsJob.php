<?php

namespace App\Jobs\Webhooks;

use App\Jobs\ApplicationJob;
use App\Services\Facebook\ReceiptRecorder;

class FacebookReceiptsJob extends ApplicationJob
{
    /** @param array<string, mixed> $messaging */
    public function __construct(public readonly array $messaging) {}

    public function handle(): void
    {
        (new ReceiptRecorder($this->messaging))->perform();
    }
}
