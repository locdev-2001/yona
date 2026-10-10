<?php

namespace App\Services\Sms;

use App\Messaging\Inbound\InboundAttachment;
use App\Messaging\Inbound\InboundMessage;
use App\Messaging\Inbound\InboundMessageWriter;
use App\Messaging\Inbound\InboundSender;
use App\Models\Inbox;
use App\Models\Message;

/** Webhook Bandwidth: một tin một lần gọi. */
class IncomingMessageService
{
    /** @param array<string, mixed> $params khối `message` của webhook Bandwidth. */
    public function __construct(
        private readonly Inbox $inbox,
        private readonly array $params,
    ) {}

    public function perform(): ?Message
    {
        $from = (string) ($this->params['from'] ?? '');

        $sender = new InboundSender(sourceId: $from, name: $from ?: null, phoneNumber: $from ?: null);

        return app(InboundMessageWriter::class)->write($this->inbox, $sender, new InboundMessage(
            sourceId: isset($this->params['id']) ? (string) $this->params['id'] : null,
            text: $this->params['text'] ?? null,
            attachments: $this->attachments(),
        ));
    }

    /**
     * URL media của Bandwidth cần basic auth của kênh nên không đưa ra trình duyệt.
     *
     * @return list<InboundAttachment>
     */
    private function attachments(): array
    {
        $config = $this->inbox->channel->provider_config ?? [];
        $specs = [];

        foreach ($this->params['media'] ?? [] as $mediaUrl) {
            // Bandwidth kèm file mô tả .smil/.xml — bản gốc không dùng.
            if (str_ends_with($mediaUrl, '.smil') || str_ends_with($mediaUrl, '.xml')) {
                continue;
            }

            $specs[] = InboundAttachment::download((string) $mediaUrl, basicAuth: [$config['api_key'] ?? '', $config['api_secret'] ?? '']);
        }

        return $specs;
    }
}
