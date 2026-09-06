<?php

namespace App\Jobs;

use App\Services\Webhooks\Trigger;

// Port từ refs/chatwoot/app/jobs/webhook_job.rb. Ba loại webhook (account, inbox
// API, agent bot) dùng chung một job.
//
// CHỮ KÝ ỔN ĐỊNH — MacrosExecutionService (D3) gọi:
//   WebhookJob::dispatch($url, $payload)
// Đổi thứ tự/tên tham số phải báo agent D3 trước.
class WebhookJob extends ApplicationJob
{
    public function __construct(
        public readonly string $url,
        public readonly array $payload,
        public readonly string $webhookType = Trigger::TYPE_ACCOUNT,
        public readonly ?string $secret = null,
        public readonly ?string $deliveryId = null,
    ) {
        $this->onQueue('medium');
    }

    public function handle(): void
    {
        Trigger::execute($this->url, $this->payload, $this->webhookType, $this->secret, $this->deliveryId);
    }
}
