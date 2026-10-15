<?php

namespace App\Http\Resources;

use App\Models\AiAgent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Nhân viên AI cho màn quản trị của account. Không có chi phí hay các bước của AI:
// doanh nghiệp không thấy những thứ đó (chỉ Super Admin xem qua nhật ký AI).
class AiAgentResource extends JsonResource
{
    /** @param  array<int, int>  $autoReplyCountsByInbox  inbox_id => số hội thoại đang tự động */
    public function __construct(AiAgent $aiAgent, private readonly array $autoReplyCountsByInbox = [])
    {
        parent::__construct($aiAgent);
    }

    public function toArray(Request $request): array
    {
        /** @var AiAgent $aiAgent */
        $aiAgent = $this->resource;
        $inboxIds = $aiAgent->inboxes->sortBy('id')->pluck('id')->map(fn ($id) => (int) $id)->values()->all();

        return [
            'id' => $aiAgent->id,
            'name' => $aiAgent->name,
            'persona' => $aiAgent->persona,
            'instructions' => $aiAgent->instructions,
            'enabled' => $aiAgent->enabled,
            'avatar_url' => $aiAgent->avatarUrl(),
            'inbox_ids' => $inboxIds,
            'auto_reply_conversations_count' => array_sum(array_intersect_key($this->autoReplyCountsByInbox, array_flip($inboxIds))),
        ];
    }
}
