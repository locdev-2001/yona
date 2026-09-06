<?php

namespace App\Services\Twilio;

use App\Models\Message;
use App\Services\Channels\ChannelMessageStatus;

// Port từ refs/chatwoot/app/services/twilio/delivery_status_service.rb.
class DeliveryStatusService
{
    /** @var array<string, string> */
    private const STATUS_MAP = [
        'sent' => 'sent',
        'delivered' => 'delivered',
        'read' => 'read',
        'failed' => 'failed',
        'undelivered' => 'failed',
    ];

    /** @param array<string, mixed> $params */
    public function __construct(private readonly array $params) {}

    public function perform(): void
    {
        $status = self::STATUS_MAP[$this->params['MessageStatus'] ?? ''] ?? null;
        $sourceId = $this->params['MessageSid'] ?? $this->params['SmsSid'] ?? null;

        if ($status === null || blank($sourceId)) {
            return;
        }

        $message = Message::query()->where('source_id', $sourceId)->first();

        if ($message === null) {
            return;
        }

        $externalError = $status === 'failed' && filled($this->params['ErrorCode'] ?? null)
            ? $this->params['ErrorCode'].' - '.($this->params['ErrorMessage'] ?? '')
            : null;

        ChannelMessageStatus::markStatus($message, $status, $externalError);
    }
}
