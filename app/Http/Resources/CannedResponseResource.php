<?php

namespace App\Http\Resources;

use App\Models\CannedResponse;
use App\Support\RailsTimestamp;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// CannedResponsesController render thẳng `render json: @canned_response` nên
// shape = as_json của model: đủ 6 cột, thời gian ISO8601 mili giây UTC.
class CannedResponseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var CannedResponse $cannedResponse */
        $cannedResponse = $this->resource;

        return [
            'id' => $cannedResponse->id,
            'account_id' => $cannedResponse->account_id,
            'short_code' => $cannedResponse->short_code,
            'content' => $cannedResponse->content,
            'content_type' => $cannedResponse->content_type,
            'content_attributes' => $cannedResponse->content_attributes,
            'created_at' => RailsTimestamp::format($cannedResponse->created_at),
            'updated_at' => RailsTimestamp::format($cannedResponse->updated_at),
        ];
    }
}
