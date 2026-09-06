<?php

namespace App\Http\Resources\Search;

use App\Http\Resources\Concerns\SerializesAttributeMaps;
use App\Http\Resources\MessageResource;
use App\Models\Conversation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/accounts/search/_conversation_search_result.json.jbuilder và
// khối inline của conversations.json.jbuilder — hai bản chỉ khác nhau ở
// additional_attributes (chỉ tab Conversations có), giữ nguyên khác biệt đó.
class SearchConversationResource extends JsonResource
{
    use SerializesAttributeMaps;

    public function __construct(Conversation $resource, private readonly bool $withAdditionalAttributes = false)
    {
        parent::__construct($resource);
    }

    /** @param iterable<Conversation> $conversations */
    public static function collectionFor(iterable $conversations, bool $withAdditionalAttributes = false): array
    {
        return collect($conversations)
            ->map(fn (Conversation $conversation) => (new self($conversation, $withAdditionalAttributes))->toArray(request()))
            ->values()
            ->all();
    }

    public function toArray(Request $request): array
    {
        /** @var Conversation $conversation */
        $conversation = $this->resource;
        $firstMessage = $conversation->messages()->first();

        return [
            'id' => $conversation->display_id,
            'account_id' => $conversation->account_id,
            'created_at' => $conversation->created_at?->getTimestamp(),
            // jbuilder luôn mở khối rỗng khi quan hệ vắng mặt → `{}` chứ không phải null.
            'message' => $firstMessage !== null ? (new MessageResource($firstMessage))->toArray($request) : new \stdClass,
            'contact' => $conversation->contact !== null
                ? (new SearchContactResource($conversation->contact))->toArray($request)
                : new \stdClass,
            'inbox' => $conversation->inbox !== null
                ? (new SearchInboxResource($conversation->inbox))->toArray($request)
                : new \stdClass,
            'agent' => $conversation->assignee !== null
                ? (new SearchAgentResource($conversation->assignee, $conversation->account_id))->toArray($request)
                : new \stdClass,
            ...($this->withAdditionalAttributes ? ['additional_attributes' => self::attributeMap($conversation->additional_attributes)] : []),
        ];
    }
}
