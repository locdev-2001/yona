<?php

namespace App\Http\Resources\Widget;

use App\Models\Conversation;

// Port từ api/v1/widget/conversations/{index,create}.json.jbuilder.
final class WidgetConversationResource
{
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
            'status' => $conversation->statusName(),
        ];
    }

    /** @return array<string, mixed> */
    public static function created(Conversation $conversation): array
    {
        return [
            ...self::summary($conversation),
            'messages' => WidgetMessageResource::collection($conversation->messages()->orderBy('id')->get()),
            'custom_attributes' => $conversation->custom_attributes ?? [],
            // `json.contact @conversation.contact` — jbuilder serialize nguyên
            // bản ghi, widget đọc email/name/phone_number từ đây.
            'contact' => $conversation->contact?->attributesToArray(),
        ];
    }
}
