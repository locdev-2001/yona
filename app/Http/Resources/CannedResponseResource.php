<?php

namespace App\Http\Resources;

use App\Models\CannedResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

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
            'created_at' => self::railsTimestamp($cannedResponse->created_at),
            'updated_at' => self::railsTimestamp($cannedResponse->updated_at),
        ];
    }

    // as_json của Rails: UTC, ISO8601 mili giây (ActiveSupport::JSON time_precision = 3).
    private static function railsTimestamp(?Carbon $moment): ?string
    {
        return $moment?->clone()->utc()->format('Y-m-d\TH:i:s.v\Z');
    }
}
