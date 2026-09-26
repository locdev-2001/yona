<?php

namespace App\Support;

use App\Http\Resources\ConversationResource;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Support\Str;

// Bản rút gọn của conversation/message dùng RIÊNG cho payload đẩy qua Reverb
// (notification.*, conversation.*, conversation.typing_on/off) — Reverb từ chối
// POST > max_request_size (config/reverb.php). KHÔNG dùng cho response REST:
// ConversationResource/MessageResource/NotificationResource giữ nguyên
// toArray()/pushEventData() của chúng cho API.
final class RealtimePayload
{
    private const CONTENT_PREVIEW_LIMIT = 200;

    // conversation.* qua Reverb — dùng lại dữ liệu ĐẦY ĐỦ đã có của
    // ConversationResource::pushEventData() (không truy vấn thêm), chỉ rút gọn
    // messages[0]/last_non_activity_message xuống bản xem trước.
    public static function conversation(Conversation $conversation): array
    {
        $data = ConversationResource::pushEventData($conversation);
        $lastMessage = $data['messages'][0] ?? null;
        $lastNonActivityMessage = $data['last_non_activity_message'];

        $nonActivityPreview = $lastNonActivityMessage === null ? null : self::messagePreviewFromData($lastNonActivityMessage);
        $lastMessagePreview = match (true) {
            $lastMessage === null => null,
            $lastNonActivityMessage !== null && $lastMessage['id'] === $lastNonActivityMessage['id'] => $nonActivityPreview,
            default => self::messagePreviewFromData($lastMessage),
        };

        return [
            ...$data,
            'messages' => $lastMessagePreview === null ? [] : [$lastMessagePreview],
            'last_non_activity_message' => $nonActivityPreview,
        ];
    }

    // messages[0]/last_non_activity_message — chỉ giữ field MessagePreview.tsx /
    // getLastMessage() thật sự đọc, bỏ sender/conversation lồng/sentiment/attachment đầy đủ.
    /** @param array<string, mixed> $message */
    private static function messagePreviewFromData(array $message): array
    {
        $attachments = $message['attachments'] ?? [];

        return [
            'id' => $message['id'],
            'content' => self::truncate($message['content']),
            // Tin có cấu trúc (thẻ, chuyển khoản…) thường không có content: danh sách hội thoại đọc dòng này.
            'preview_text' => $message['preview_text'] ?? null,
            'content_type' => $message['content_type'],
            'content_attributes' => self::compactContentAttributes($message['content_attributes'] ?? null),
            'message_type' => $message['message_type'],
            'private' => $message['private'],
            'created_at' => $message['created_at'],
            ...($attachments === [] ? [] : [
                'attachments' => [['file_type' => $attachments[0]['file_type']]],
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
            'inbox_id' => $conversation->inbox_id,
            'priority' => $conversation->priorityName(),
            'meta' => [
                'sender' => [
                    'name' => $contact?->name,
                    'thumbnail' => $contact?->avatarUrl(),
                ],
            ],
        ];
    }

    // notification.secondary_actor — không có consumer đọc field nào ngoài id trên
    // FE hiện tại (chỉ khai type), nên chỉ gửi id.
    public static function notificationSecondaryActor(Message $message): array
    {
        return ['id' => $message->id];
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
