<?php

namespace App\Http\Resources;

use App\Http\Resources\Search\SearchContactResource;
use App\Http\Resources\Search\SearchInboxResource;
use App\Models\Conversation;
use App\Services\Messages\Forwarding\ForwardBlock;

/**
 * Một dòng của hộp chọn đích chuyển tiếp. `forwardable`/`reason` do lõi quyết cho
 * từng đích; FE chỉ đọc, không tự suy luật. `inbox.channel_type` chỉ để chọn icon.
 */
final class ForwardTargetResource
{
    /** @return array<string, mixed> */
    public static function toArray(Conversation $conversation, ?ForwardBlock $block): array
    {
        $request = request();
        $contact = $conversation->contact;

        return [
            'id' => $conversation->display_id,
            'status' => $conversation->statusName(),
            'last_activity_at' => $conversation->last_activity_at?->getTimestamp(),
            'inbox' => (new SearchInboxResource($conversation->inbox))->toArray($request),
            'contact' => $contact === null
                ? new \stdClass
                : [...(new SearchContactResource($contact))->toArray($request), 'thumbnail' => $contact->avatarUrl()],
            'forwardable' => $block === null,
            'code' => $block?->code,
            'reason' => $block?->message,
            'missing_capabilities' => $block?->missingCapabilities ?? [],
        ];
    }
}
