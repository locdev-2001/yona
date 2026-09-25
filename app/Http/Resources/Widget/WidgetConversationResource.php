<?php

namespace App\Http\Resources\Widget;

use App\Http\Resources\Concerns\SerializesAttributeMaps;
use App\Messaging\MessagePreview;
use App\Models\Conversation;
use App\Models\Message;

// Port từ api/v1/widget/conversations/{index,create}.json.jbuilder.
final class WidgetConversationResource
{
    use SerializesAttributeMaps;

    /** @return array<string, mixed> */
    public static function summary(?Conversation $conversation): array
    {
        // `if @conversation` của index: không có hội thoại thì body là {}.
        if ($conversation === null) {
            return [];
        }

        return [
            'id' => $conversation->display_id,
            'inbox_id' => $conversation->inbox_id,
            'contact_last_seen_at' => $conversation->contact_last_seen_at?->getTimestamp() ?? 0,
            // Mốc agent đọc hội thoại: widget suy ra "Đã xem" dưới tin của khách.
            'agent_last_seen_at' => $conversation->agent_last_seen_at?->getTimestamp() ?? 0,
            'status' => $conversation->statusName(),
            'created_at' => $conversation->created_at?->getTimestamp(),
            // Nhân viên đang phụ trách: widget hiện tên, ảnh và trạng thái trực của người này
            // thay cho hộp thư.
            'assignee' => self::assignee($conversation),
        ];
    }

    /** @return array{id: int, name: string, avatar_url: string, availability_status: string|null}|null */
    /** Một dòng của tab Tin nhắn. Cần `contact_unread_count` từ withCount. */
    public static function listItem(Conversation $conversation, MessagePreview $preview): array
    {
        // ponytail: một truy vấn tin cuối mỗi hội thoại (≤ 20/trang); gộp bằng lateral join nếu danh sách dài ra.
        $last = $conversation->messages()
            ->where('private', false)
            ->where('message_type', '!=', Message::TYPE_ACTIVITY)
            ->reorder('id', 'desc')
            ->first();

        return [
            ...self::summary($conversation),
            'unread_count' => (int) $conversation->contact_unread_count,
            'last_activity_at' => $conversation->last_activity_at?->getTimestamp(),
            'last_message' => $last === null ? null : [
                'id' => $last->id,
                'preview' => $preview->for($last),
                'message_type' => $last->message_type,
                'created_at' => $last->created_at->getTimestamp(),
            ],
        ];
    }

    private static function assignee(Conversation $conversation): ?array
    {
        $agent = $conversation->assignee;

        return $agent === null ? null : WidgetAgentResource::make($agent, $conversation->account_id);
    }

    /** @return array<string, mixed> */
    public static function created(Conversation $conversation): array
    {
        return [
            ...self::summary($conversation),
            'messages' => WidgetMessageResource::collection($conversation->messages()->orderBy('id')->get()),
            'custom_attributes' => self::attributeMap($conversation->custom_attributes),
            // `json.contact @conversation.contact` — jbuilder serialize nguyên
            // bản ghi, widget đọc email/name/phone_number từ đây.
            'contact' => $conversation->contact?->attributesToArray(),
        ];
    }
}
