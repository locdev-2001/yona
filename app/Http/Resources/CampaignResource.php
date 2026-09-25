<?php

namespace App\Http\Resources;

use App\Models\Campaign;
use App\Support\RailsTimestamp;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/models/_campaign.json.jbuilder — bốn view index/show/create/
// update đều dùng chung partial này.
class CampaignResource extends JsonResource
{
    public function __construct(Campaign $resource, private readonly bool $administrator)
    {
        parent::__construct($resource);
    }

    /** @param iterable<Campaign> $campaigns */
    public static function collectionFor(iterable $campaigns, bool $administrator): array
    {
        return collect($campaigns)
            ->map(fn (Campaign $campaign) => (new self($campaign, $administrator))->toArray(request()))
            ->values()
            ->all();
    }

    public function toArray(Request $request): array
    {
        /** @var Campaign $campaign */
        $campaign = $this->resource;

        return [
            // `id` của campaign trên API là display_id per-account, không phải khoá chính.
            'id' => $campaign->display_id,
            'title' => $campaign->title,
            'description' => $campaign->description,
            'account_id' => $campaign->account_id,
            'inbox' => (new InboxResource($campaign->inbox, $this->administrator))->toArray($request),
            // jbuilder mở khối `json.sender` rồi mới kiểm tra present? — không có
            // người gửi thì khoá vẫn hiện với object rỗng (campaign do bot gửi).
            'sender' => $campaign->sender === null
                ? []
                : (new AgentResource($campaign->sender, $campaign->account))->toArray($request),
            'message' => $campaign->message,
            'template_params' => $campaign->template_params,
            'campaign_status' => $campaign->statusName(),
            'enabled' => $campaign->enabled,
            'campaign_type' => $campaign->typeName(),
            ...$this->oneOffAttributes($campaign),
            'trigger_rules' => $campaign->trigger_rules ?? [],
            'trigger_only_during_business_hours' => $campaign->trigger_only_during_business_hours,
            'quick_replies' => $campaign->quick_replies ?? [],
            'show_to' => $campaign->show_to,
            'created_at' => RailsTimestamp::format($campaign->created_at),
            'updated_at' => RailsTimestamp::format($campaign->updated_at),
        ];
    }

    /** @return array<string, mixed> */
    private function oneOffAttributes(Campaign $campaign): array
    {
        if ($campaign->isOngoing()) {
            return [];
        }

        return [
            'scheduled_at' => $campaign->scheduled_at?->getTimestamp() ?? 0,
            'started_at' => $campaign->started_at?->getTimestamp(),
            'completed_at' => $campaign->completed_at?->getTimestamp(),
            'audience' => $campaign->audience ?? [],
        ];
    }
}
