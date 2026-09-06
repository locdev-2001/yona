<?php

namespace App\Jobs\AgentBots;

use App\Jobs\WebhookJob as BaseWebhookJob;
use App\Services\Webhooks\RetryableError;
use App\Services\Webhooks\Trigger;
use Illuminate\Support\Facades\Log;
use Throwable;

// Port từ refs/chatwoot/app/jobs/agent_bots/webhook_job.rb: hàng đợi `high`,
// thử lại 3 lần cách 3 giây với lỗi 429/500; hết lượt thì chạy nhánh xử lý
// thất bại của Trigger (đưa hội thoại pending về open + tin hoạt động).
class WebhookJob extends BaseWebhookJob
{
    public int $tries = 3;

    public function __construct(
        string $url,
        array $payload,
        string $webhookType = Trigger::TYPE_AGENT_BOT,
        ?string $secret = null,
        ?string $deliveryId = null,
    ) {
        parent::__construct($url, $payload, $webhookType, $secret, $deliveryId);
        $this->onQueue('high');
    }

    /** @return list<int> */
    public function backoff(): array
    {
        return [3, 3];
    }

    public function handle(): void
    {
        try {
            parent::handle();
        } catch (RetryableError $error) {
            Log::warning(sprintf(
                '[AgentBots\\WebhookJob] attempt %d failed %s payload=%s',
                $this->attempts(),
                $error::class,
                json_encode($this->payload),
            ));

            throw $error;
        }
    }

    // retry_on … do |job, error| — chạy sau khi cạn lượt thử lại.
    public function failed(?Throwable $error): void
    {
        if (! $error instanceof RetryableError) {
            return;
        }

        (new Trigger($this->url, $this->payload, $this->webhookType, $this->secret, $this->deliveryId))
            ->handleFailure($error);
    }
}
