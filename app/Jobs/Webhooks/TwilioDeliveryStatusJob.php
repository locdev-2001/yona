<?php

namespace App\Jobs\Webhooks;

use App\Jobs\ApplicationJob;
use App\Services\Twilio\DeliveryStatusService;

// Port từ refs/chatwoot/app/jobs/webhooks/twilio_delivery_status_job.rb.
class TwilioDeliveryStatusJob extends ApplicationJob
{
    /** @param array<string, mixed> $params */
    public function __construct(public readonly array $params) {}

    public function handle(): void
    {
        (new DeliveryStatusService($this->params))->perform();
    }
}
