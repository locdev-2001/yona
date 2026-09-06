<?php

namespace App\Jobs\Webhooks;

use App\Jobs\ApplicationJob;
use App\Models\Channel\Whatsapp;
use App\Services\Whatsapp\IncomingMessageService;

// Port từ refs/chatwoot/app/jobs/webhooks/whatsapp_events_job.rb.
class WhatsappEventsJob extends ApplicationJob
{
    /**
     * `retry_on LockAcquisitionError, wait: 2.seconds, attempts: 20` của bản gốc.
     * Chạy lại an toàn vì service bỏ qua tin đã có `source_id` ngay đầu vào,
     * nên một lượt hỏng giữa chừng không sinh tin trùng.
     */
    public int $tries = 20;

    public int $backoff = 2;

    /** @param array<string, mixed> $params */
    public function __construct(public readonly array $params) {}

    public function handle(): void
    {
        $channel = $this->findChannel();

        if ($channel === null || $channel->inbox === null || ! $channel->account->isActive()) {
            return;
        }

        // field `smb_message_echoes` = tin gửi từ app WhatsApp Business của chính shop.
        $isEcho = data_get($this->params, 'entry.0.changes.0.field') === 'smb_message_echoes';

        (new IncomingMessageService($channel->inbox, $this->params, outgoingEcho: $isEcho))->perform();
    }

    private function findChannel(): ?Whatsapp
    {
        if (($this->params['object'] ?? null) === 'whatsapp_business_account') {
            $metadata = (array) data_get($this->params, 'entry.0.changes.0.value.metadata', []);
            $displayPhoneNumber = $metadata['display_phone_number'] ?? null;

            if (filled($displayPhoneNumber)) {
                $channel = Whatsapp::query()->where('phone_number', '+'.ltrim((string) $displayPhoneNumber, '+'))->first();

                if ($channel !== null) {
                    return $channel;
                }
            }
        }

        return filled($this->params['phone_number'] ?? null)
            ? Whatsapp::query()->where('phone_number', $this->params['phone_number'])->first()
            : null;
    }
}
