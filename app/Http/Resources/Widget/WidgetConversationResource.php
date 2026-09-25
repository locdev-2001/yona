<?php

namespace App\Http\Resources\Widget;

use App\Http\Resources\Concerns\SerializesAttributeMaps;
use App\Models\Conversation;

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
