<?php

namespace App\Builders\Messages\Instagram;

use App\Builders\Messages\Messenger\BaseMessageBuilder;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Channels\IncomingConversationResolver;
use Illuminate\Support\Facades\DB;

/**
 * Port từ refs/chatwoot/app/builders/messages/instagram/base_message_builder.rb
 * (+ hai lớp con MessageBuilder / Messenger::MessageBuilder — khác biệt còn lại
 * là nguồn liên hệ, đã do Instagram\MessageTextService lo trước).
 */
class MessageBuilder extends BaseMessageBuilder
{
    /** @param array<string, mixed> $messaging */
    public function __construct(
        private readonly array $messaging,
        private readonly Inbox $inbox,
        private readonly bool $outgoingEcho = false,
    ) {}

    public function perform(): ?Message
    {
        $sourceId = (string) ($this->outgoingEcho
            ? data_get($this->messaging, 'recipient.id')
            : data_get($this->messaging, 'sender.id'));

        $contactInbox = $this->inbox->contactInboxes()->where('source_id', $sourceId)->first();

        if ($contactInbox === null) {
            return null;
        }

        return DB::transaction(function () use ($contactInbox) {
            $conversation = IncomingConversationResolver::resolve($contactInbox);

            $contentAttributes = [];

            if (filled(data_get($this->messaging, 'message.reply_to.mid'))) {
                $contentAttributes['in_reply_to_external_id'] = data_get($this->messaging, 'message.reply_to.mid');
            }

            if ($this->outgoingEcho) {
                $contentAttributes['external_echo'] = true;
            }

            $message = $conversation->messages()->make([
                'account_id' => $conversation->account_id,
                'inbox_id' => $conversation->inbox_id,
                'message_type' => $this->outgoingEcho ? Message::TYPE_OUTGOING : Message::TYPE_INCOMING,
                'status' => $this->outgoingEcho ? Message::STATUSES['delivered'] : Message::STATUSES['sent'],
                'content' => data_get($this->messaging, 'message.text'),
                'source_id' => data_get($this->messaging, 'message.mid'),
                'content_attributes' => $contentAttributes,
            ]);

            if (! $this->outgoingEcho) {
                $message->sender()->associate($contactInbox->contact);
            }

            $message->save();

            foreach ((array) data_get($this->messaging, 'message.attachments', []) as $attachment) {
                $this->processAttachment($message, $attachment);
            }

            return $message;
        });
    }
}
