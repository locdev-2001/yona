<?php

namespace App\Http\Resources;

use App\Models\CustomFilter;
use App\Support\RailsTimestamp;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/models/_custom_filter.json.jbuilder.
class CustomFilterResource extends JsonResource
{
    /**
     * @param  iterable<CustomFilter>  $filters
     * @return list<array<string, mixed>>
     */
    public static function collectionFor(iterable $filters): array
    {
        return collect($filters)
            ->map(fn (CustomFilter $filter) => (new self($filter))->toArray(request()))
            ->values()
            ->all();
    }

    public function toArray(Request $request): array
    {
        /** @var CustomFilter $filter */
        $filter = $this->resource;

        return [
            'id' => $filter->id,
            'name' => $filter->name,
            'filter_type' => $filter->filter_type,
            'query' => $filter->query ?? [],
            'created_at' => RailsTimestamp::format($filter->created_at),
            'updated_at' => RailsTimestamp::format($filter->updated_at),
        ];
    }
}
