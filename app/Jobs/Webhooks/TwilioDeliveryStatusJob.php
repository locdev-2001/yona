<?php

namespace App\Jobs\Webhooks;

use App\Jobs\ApplicationJob;
use App\Services\Twilio\DeliveryStatusService;

class TwilioDeliveryStatusJob extends ApplicationJob
{
    /** @param array<string, mixed> $params */
    public function __construct(public readonly array $params) {}

    public function handle(): void
    {
        (new DeliveryStatusService($this->params))->perform();
    }
}
