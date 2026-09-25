<?php

namespace App\Support;

use App\Http\Resources\MessageResource;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Support\Str;

// Bản rút gọn của conversation/message dùng RIÊNG cho payload đẩy qua Reverb
// (notification.*, conversation.*, conversation.typing_on/off) — Reverb từ chối
// POST > max_request_size (config/reverb.php), payload nặng nhất đo được ~90KB
// (tin 4000 ký tự + album 20 ảnh + 12 nhãn) vì gửi lặp tin nhắn đầy đủ 2-3 lần.
// KHÔNG dùng cho response REST: ConversationResource/MessageResource/NotificationResource
// giữ nguyên toArray()/pushEventData() của chúng cho API.
final class RealtimePayload
{
    private const CONTENT_PREVIEW_LIMIT = 200;

    // Xem trước tin nhắn cho danh sách hội thoại (messages[0] và last_non_activity_message
    // của ConversationResource::pushEventData) — chỉ giữ field MessagePreview.tsx /
    // getLastMessage() thật sự đọc, bỏ sender/conversation lồng/sentiment/attachment đầy đủ.
    public static function messagePreview(Message $message): array
    {
        $attachments = $message->attachments;

        return [
            'id' => $message->id,
            'content' => self::truncate($message->content),
            'content_type' => $message->contentTypeName(),
            'content_attributes' => self::compactContentAttributes($message->content_attributes),
            'message_type' => $message->message_type,
            'private' => $message->private,
            'created_at' => $message->created_at->getTimestamp(),
            ...($attachments->isEmpty() ? [] : [
                'attachments' => [['file_type' => $attachments->first()->fileTypeName()]],
            ]),
        ];
    }

    // notification.primary_actor — dashboard chỉ đọc id/inbox_id/priority/meta.sender
    // (InboxCard, InboxList, useUnreadCount…), không cần toàn bộ ConversationResource.
    public static function notificationPrimaryActor(Conversation $conversation): array
    {
        $contact = $conversation->contact;

        return [
            'id' => $conversation->display_id,
            'display_id' => $conversation->display_id,
            'inbox_id' => $conversation->inbox_id,
            'status' => $conversation->statusName(),
            'priority' => $conversation->priorityName(),
            'meta' => [
                'sender' => [
                    'name' => $contact?->name,
                    'thumbnail' => $contact?->avatarUrl(),
                ],
            ],
        ];
    }

    // notification.secondary_actor — không có consumer đọc field nào trên FE hiện tại
    // (chỉ khai type), nên rút theo đúng yêu cầu: id, sender, nội dung cắt ngắn,
    // số lượng/loại tệp — không kèm URL tệp (kể cả chưa ký).
    public static function notificationSecondaryActor(Message $message): array
    {
        $attachments = $message->attachments;

        return [
            'id' => $message->id,
            'content' => self::truncate($message->content),
            ...($message->sender === null ? [] : [
                'sender' => MessageResource::senderPushEventData($message->sender, $message->account, $message->inbox),
            ]),
            'attachment_count' => $attachments->count(),
            'attachment_types' => $attachments->map(fn ($attachment) => $attachment->fileTypeName())->unique()->values()->all(),
        ];
    }

    // conversation.typing_on/off — ActionCableConnector.ts và WidgetConnector.ts chỉ
    // đọc conversation.id (display_id) để so khớp hội thoại đang mở.
    public static function typingConversation(Conversation $conversation): array
    {
        return ['id' => $conversation->display_id];
    }

    private static function truncate(?string $content): ?string
    {
        return $content === null ? null : Str::limit($content, self::CONTENT_PREVIEW_LIMIT, '…');
    }

    // MessagePreview.tsx / deletedMessageLabel() chỉ đọc 3 khoá này của content_attributes.
    /** @param array<string, mixed>|null $attributes @return array<string, mixed> */
    private static function compactContentAttributes(?array $attributes): array
    {
        if (empty($attributes)) {
            return [];
        }

        $compact = [];

        if (! empty($attributes['deleted'])) {
            $compact['deleted'] = true;
        }

        if (! empty($attributes['friend_request'])) {
            $compact['friend_request'] = true;
        }

        if (isset($attributes['email']['subject'])) {
            $compact['email'] = ['subject' => $attributes['email']['subject']];
        }

        return $compact;
    }
}
