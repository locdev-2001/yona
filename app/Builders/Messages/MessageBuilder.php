<?php

namespace App\Builders\Messages;

use App\Exceptions\MessageValidationException;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;

// Port từ refs/chatwoot/app/builders/messages/message_builder.rb.
// Bỏ ở B3: attachments (B9), xử lý email cc/bcc + html/liquid (F1),
// sender AgentBot (D4), campaign_id (C4), template_params (kênh WhatsApp F5).
class MessageBuilder
{
    private ?Message $message = null;

    /** @param array<string, mixed> $params */
    public function __construct(
        private readonly ?User $user,
        private readonly Conversation $conversation,
        private readonly array $params,
    ) {}

    public function perform(): Message
    {
        $this->message = new Message($this->messageParams());
        $this->message->echoId = isset($this->params['echo_id']) ? (string) $this->params['echo_id'] : null;
        $this->message->sender()->associate($this->sender());
        $this->message->save();

        return $this->message;
    }

    /** @return array<string, mixed> */
    private function messageParams(): array
    {
        $attributes = [
            'account_id' => $this->conversation->account_id,
            'inbox_id' => $this->conversation->inbox_id,
            'message_type' => $this->messageType(),
            'content' => $this->params['content'] ?? null,
            'private' => (bool) ($this->params['private'] ?? false),
            'content_type' => Message::contentTypeFromName($this->params['content_type'] ?? null),
            'source_id' => $this->params['source_id'] ?? null,
        ];

        $contentAttributes = $this->contentAttributes();

        if ($contentAttributes !== []) {
            $attributes['content_attributes'] = $contentAttributes;
        }

        // conversation.messages.build — gán quan hệ trước khi save.
        $attributes['conversation_id'] = $this->conversation->id;

        return $attributes;
    }

    private function messageType(): int
    {
        $requested = $this->params['message_type'] ?? 'outgoing';

        if ($this->conversation->inbox->channel_type !== 'Channel::Api' && $requested === 'incoming') {
            throw new MessageValidationException('Incoming messages are only allowed in Api inboxes');
        }

        $messageType = Message::typeFromName($requested);

        if ($messageType === null) {
            throw new MessageValidationException("'{$requested}' is not a valid message_type");
        }

        return $messageType;
    }

    private function sender(): User|Contact|null
    {
        return $this->messageType() === Message::TYPE_OUTGOING
            ? $this->user
            : $this->conversation->contact;
    }

    /**
     * Chuỗi JSON → array; array giữ nguyên; kiểu khác → rỗng (y bản gốc).
     *
     * @return array<string, mixed>
     */
    private function contentAttributes(): array
    {
        $contentAttributes = $this->params['content_attributes'] ?? [];

        if (is_string($contentAttributes)) {
            $decoded = json_decode($contentAttributes, true);

            return is_array($decoded) ? $decoded : [];
        }

        return is_array($contentAttributes) ? $contentAttributes : [];
    }
}
