<?php

namespace App\Jobs\Webhooks;

use App\Jobs\ApplicationJob;
use App\Services\Twilio\IncomingMessageService;

// Port từ refs/chatwoot/app/jobs/webhooks/twilio_events_job.rb.
class TwilioEventsJob extends ApplicationJob
{
    /** @param array<string, mixed> $params */
    public function __construct(public readonly array $params) {}

    public function handle(): void
    {
        $hasBody = filled($this->params['Body'] ?? null);
        $hasMedia = filled($this->params['MediaUrl0'] ?? null);
        $isLocation = ($this->params['MessageType'] ?? null) === 'location'
            && filled($this->params['Latitude'] ?? null)
            && filled($this->params['Longitude'] ?? null);

        if (! $hasBody && ! $hasMedia && ! $isLocation) {
            return;
        }

        (new IncomingMessageService($this->params))->perform();
    }
}
