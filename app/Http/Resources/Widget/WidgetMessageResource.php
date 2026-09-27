<?php

namespace App\Http\Resources\Widget;

use App\Http\Resources\MessageResource;
use App\Models\Attachment;
use App\Models\Message;

// Port từ api/v1/models/_widget_message.json.jbuilder (dùng cho messages#index
// và conversations#create) + api/v1/widget/messages/create.json.jbuilder.
// Widget nhận shape RIÊNG, gọn hơn dashboard — không dùng chung MessageResource.
final class WidgetMessageResource
{
    /** @param iterable<Message> $messages @return list<array<string, mixed>> */
    public static function collection(iterable $messages): array
    {
        return collect($messages)->map(fn (Message $message) => self::listItem($message))->values()->all();
    }

    /** @return array<string, mixed> */
    public static function listItem(Message $message): array
    {
        return [
            'id' => $message->id,
            'content' => $message->content,
            'message_type' => $message->message_type,
            'content_type' => $message->contentTypeName(),
            'content_attributes' => MessageResource::contentAttributes($message),
            'status' => $message->statusName(),
            'created_at' => $message->created_at->getTimestamp(),
            'conversation_id' => $message->conversation->display_id,
            ...self::attachments($message),
            ...self::sender($message),
        ];
    }

    /**
     * messages/create.json.jbuilder — có inbox_id/private/source_id; thêm
     * `content_type` và `status` để tin vừa gửi (sticker, "Đã gửi") hiện giống
     * hệt lúc tải lại danh sách.
     *
     * @return array<string, mixed>
     */
    public static function created(Message $message): array
    {
        return [
            'id' => $message->id,
            'content' => $message->content,
            'inbox_id' => $message->inbox_id,
            'conversation_id' => $message->conversation->display_id,
            'message_type' => $message->message_type,
            'content_type' => $message->contentTypeName(),
            'status' => $message->statusName(),
            'created_at' => $message->created_at->getTimestamp(),
            'private' => $message->private,
            'source_id' => $message->source_id,
            'content_attributes' => MessageResource::contentAttributes($message),
            ...self::attachments($message),
            ...self::sender($message),
        ];
    }

    /** @return array<string, mixed> */
    private static function attachments(Message $message): array
    {
        $attachments = $message->attachments;

        return $attachments->isEmpty()
            ? []
            : ['attachments' => $attachments->map(fn (Attachment $attachment) => $attachment->pushEventData())->values()->all()];
    }

    /** @return array<string, mixed> */
    private static function sender(Message $message): array
    {
        return $message->sender === null
            ? []
            : ['sender' => MessageResource::senderPushEventData($message->sender, $message->account)];
    }
}
