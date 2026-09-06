<?php

namespace App\Services\Sms;

use App\Builders\ContactInboxWithContactBuilder;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Channels\IncomingConversationResolver;
use App\Services\Channels\RemoteAttachmentDownloader;

// Port từ refs/chatwoot/app/services/sms/incoming_message_service.rb.
class IncomingMessageService
{
    /** @param array<string, mixed> $params khối `message` của webhook Bandwidth. */
    public function __construct(
        private readonly Inbox $inbox,
        private readonly array $params,
    ) {}

    public function perform(): ?Message
    {
        $contactInbox = (new ContactInboxWithContactBuilder(
            inbox: $this->inbox,
            contactAttributes: [
                'name' => $this->params['from'] ?? null,
                'phone_number' => $this->params['from'] ?? null,
            ],
            sourceId: (string) ($this->params['from'] ?? ''),
        ))->perform();

        if ($contactInbox === null) {
            return null;
        }

        $conversation = IncomingConversationResolver::resolve($contactInbox);

        $message = $conversation->messages()->make([
            'content' => $this->params['text'] ?? null,
            'account_id' => $this->inbox->account_id,
            'inbox_id' => $this->inbox->id,
            'message_type' => Message::TYPE_INCOMING,
            'source_id' => $this->params['id'] ?? null,
        ]);
        $message->sender()->associate($contactInbox->contact);
        $message->save();

        $this->attachFiles($message);

        return $message;
    }

    private function attachFiles(Message $message): void
    {
        $config = $this->inbox->channel->provider_config ?? [];

        foreach ($this->params['media'] ?? [] as $mediaUrl) {
            // Bandwidth kèm file mô tả .smil/.xml — Chatwoot không dùng.
            if (str_ends_with($mediaUrl, '.smil') || str_ends_with($mediaUrl, '.xml')) {
                continue;
            }

            $attributes = RemoteAttachmentDownloader::download(
                url: $mediaUrl,
                accountId: $message->account_id,
                basicAuth: [$config['api_key'] ?? '', $config['api_secret'] ?? ''],
            );

            if ($attributes !== null) {
                $message->attachments()->create($attributes);
            }
        }
    }
}
