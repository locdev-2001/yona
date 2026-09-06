<?php

namespace App\Http\Resources\Search;

use App\Models\Inbox;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/accounts/search/_inbox.json.jbuilder.
class SearchInboxResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var Inbox $inbox */
        $inbox = $this->resource;

        return [
            'id' => $inbox->id,
            'channel_id' => $inbox->channel_id,
            'name' => $inbox->name,
            'channel_type' => $inbox->channel_type,
        ];
    }
}
