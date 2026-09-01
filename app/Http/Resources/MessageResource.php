<?php

namespace App\Http\Resources;

use App\Models\Contact;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/models/_message.json.jbuilder + Message#push_event_data.
// Bỏ ở B3: attachments (B9), voice call (EE).
class MessageResource extends JsonResource
{
    /** @param iterable<Message> $messages */
    public static function collectionFor(iterable $messages): array
    {
        return collect($messages)
            ->map(fn (Message $message) => (new self($message))->toArray(request()))
            ->values()
            ->all();
    }

    public function toArray(Request $request): array
    {
        /** @var Message $message */
        $message = $this->resource;

        return [
            'id' => $message->id,
            'content' => $message->content,
            'inbox_id' => $message->inbox_id,
            ...($message->echoId !== null ? ['echo_id' => $message->echoId] : []),
            'conversation_id' => $message->conversation->display_id,
            'message_type' => $message->message_type,
            'content_type' => $message->contentTypeName(),
            'status' => $message->statusName(),
            'content_attributes' => $message->content_attributes ?? [],
            'created_at' => $message->created_at->getTimestamp(),
            'private' => $message->private,
            'source_id' => $message->source_id,
            ...($message->sender !== null ? ['sender' => self::senderPushEventData($message->sender)] : []),
        ];
    }

    // Message#push_event_data: toàn bộ attributes + sender + tóm tắt conversation.
    public static function pushEventData(Message $message): array
    {
        $data = [
            'id' => $message->id,
            'content' => $message->content,
            'account_id' => $message->account_id,
            'inbox_id' => $message->inbox_id,
            'conversation_id' => $message->conversation->display_id,
            'message_type' => $message->message_type,
            'created_at' => $message->created_at->getTimestamp(),
            'updated_at' => $message->updated_at->toISOString(),
            'private' => $message->private,
            'status' => $message->statusName(),
            'source_id' => $message->source_id,
            'content_type' => $message->contentTypeName(),
            'content_attributes' => $message->content_attributes ?? [],
            'sender_type' => $message->sender_type,
            'sender_id' => $message->sender_id,
            'external_source_ids' => $message->external_source_ids ?? [],
            'additional_attributes' => $message->additional_attributes ?? [],
            'processed_message_content' => $message->processed_message_content,
            'sentiment' => $message->sentiment ?? [],
            'conversation' => [
                'assignee_id' => $message->conversation->assignee_id,
                'unread_count' => $message->conversation->unreadIncomingMessagesCount(),
                'last_activity_at' => $message->conversation->last_activity_at->getTimestamp(),
                'contact_inbox' => [
                    'source_id' => $message->conversation->contactInbox?->source_id,
                ],
            ],
        ];

        if ($message->echoId !== null) {
            $data['echo_id'] = $message->echoId;
        }

        if ($message->sender !== null) {
            $data['sender'] = self::senderPushEventData($message->sender);
        }

        return $data;
    }

    public static function senderPushEventData(User|Contact $sender): array
    {
        if ($sender instanceof User) {
            return [
                'id' => $sender->id,
                'name' => $sender->name,
                'available_name' => $sender->availableName(),
                'avatar_url' => $sender->avatarUrl(),
                'type' => 'user',
                // Presence B4 — chưa ai online, khớp oracle khi Redis trống.
                'availability_status' => 'offline',
                'thumbnail' => $sender->avatarUrl(),
            ];
        }

        $data = [
            'additional_attributes' => $sender->additional_attributes ?? [],
            'custom_attributes' => $sender->custom_attributes ?? [],
            'email' => $sender->email,
            'id' => $sender->id,
            'identifier' => $sender->identifier,
            'name' => $sender->name,
            'phone_number' => $sender->phone_number,
            'thumbnail' => $sender->avatarUrl(),
            'blocked' => $sender->blocked,
            'type' => 'contact',
        ];

        if ($sender->account->featureEnabled('companies')) {
            $data['company_id'] = $sender->company_id;
        }

        return $data;
    }
}
