<?php

namespace App\Services\Sms;

use App\Models\Inbox;
use App\Models\Message;
use App\Services\Channels\ChannelMessageStatus;

// Port từ refs/chatwoot/app/services/sms/delivery_status_service.rb.
class DeliveryStatusService
{
    /** @var array<string, string> */
    private const STATUS_MAP = ['message-delivered' => 'delivered', 'message-failed' => 'failed'];

    /** @param array<string, mixed> $params payload webhook đầy đủ (có `type` và `message`). */
    public function __construct(
        private readonly Inbox $inbox,
        private readonly array $params,
    ) {}

    public function perform(): void
    {
        $status = self::STATUS_MAP[$this->params['type'] ?? ''] ?? null;

        if ($status === null) {
            return;
        }

        $sourceId = data_get($this->params, 'message.id');

        if (blank($sourceId)) {
            return;
        }

        $message = $this->inbox->messages()->where('source_id', $sourceId)->first();

        if ($message === null) {
            return;
        }

        $externalError = $status === 'failed' && filled($this->params['errorCode'] ?? null)
            ? $this->params['errorCode'].' - '.($this->params['description'] ?? '')
            : null;

        ChannelMessageStatus::markStatus($message, $status, $externalError);
    }
}
