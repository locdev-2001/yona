<?php

namespace App\Http\Resources;

use App\Models\DashboardApp;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/models/_dashboard_app.json.jbuilder.
class DashboardAppResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var DashboardApp $app */
        $app = $this->resource;

        return [
            'id' => $app->id,
            'title' => $app->title,
            'content' => $app->content ?? [],
            'created_at' => $app->created_at?->toIso8601String(),
        ];
    }

    /** @param iterable<DashboardApp> $apps */
    public static function collectionFor(iterable $apps): array
    {
        return collect($apps)
            ->map(fn (DashboardApp $app) => (new self($app))->toArray(request()))
            ->values()
            ->all();
    }
}
