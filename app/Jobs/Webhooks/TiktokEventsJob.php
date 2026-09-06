<?php

namespace App\Jobs\Webhooks;

use App\Jobs\ApplicationJob;
use App\Models\Channel\Tiktok;
use App\Services\Tiktok\MessageService;

// Port từ refs/chatwoot/app/jobs/webhooks/tiktok_events_job.rb.
class TiktokEventsJob extends ApplicationJob
{
    /**
     * `retry_on LockAcquisitionError, wait: 2.seconds, attempts: 8` của bản gốc.
     * Chạy lại an toàn vì MessageService tra `source_id` trước khi dựng tin mới.
     */
    public int $tries = 8;

    public int $backoff = 2;

    /** @var list<string> */
    private const SUPPORTED_EVENTS = ['im_send_msg', 'im_receive_msg', 'im_mark_read_msg'];

    /** @param array<string, mixed> $event */
    public function __construct(public readonly array $event) {}

    public function handle(): void
    {
        $eventName = $this->event['event'] ?? null;

        if (! in_array($eventName, self::SUPPORTED_EVENTS, true)) {
            return;
        }

        $channel = Tiktok::query()->where('business_id', $this->event['user_openid'] ?? '')->first();

        if ($channel === null || $channel->inbox === null || ! $channel->account->isActive()) {
            return;
        }

        $content = json_decode((string) ($this->event['content'] ?? ''), true);

        if (! is_array($content) || $eventName === 'im_mark_read_msg') {
            return;
        }

        (new MessageService($channel, $content, outgoingEcho: $eventName === 'im_send_msg'))->perform();
    }
}
