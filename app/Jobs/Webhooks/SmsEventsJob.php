<?php

namespace App\Jobs\Webhooks;

use App\Jobs\ApplicationJob;
use App\Models\Channel\Sms;
use App\Services\Sms\DeliveryStatusService;
use App\Services\Sms\IncomingMessageService;

// Port từ refs/chatwoot/app/jobs/webhooks/sms_events_job.rb.
class SmsEventsJob extends ApplicationJob
{
    /** @var list<string> */
    private const SUPPORTED_EVENTS = ['message-received', 'message-delivered', 'message-failed'];

    /** @param array<string, mixed> $params */
    public function __construct(public readonly array $params) {}

    public function handle(): void
    {
        if (! in_array($this->params['type'] ?? null, self::SUPPORTED_EVENTS, true)) {
            return;
        }

        $channel = Sms::query()->where('phone_number', $this->params['to'] ?? '')->first();

        if ($channel === null || $channel->inbox === null) {
            return;
        }

        if (in_array($this->params['type'], ['message-delivered', 'message-failed'], true)) {
            (new DeliveryStatusService($channel->inbox, $this->params))->perform();

            return;
        }

        (new IncomingMessageService($channel->inbox, (array) ($this->params['message'] ?? [])))->perform();
    }
}
