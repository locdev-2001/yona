<?php

namespace App\Http\Resources\Public\Hc;

use App\Models\Portal;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ public/api/v1/models/hc/_portal.json.jbuilder.
class PortalResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var Portal $portal */
        $portal = $this->resource;

        $payload = [
            'custom_domain' => $portal->custom_domain,
            'header_text' => $portal->header_text,
            'homepage_link' => $portal->homepage_link,
            'name' => $portal->name,
            'page_title' => $portal->page_title,
            'slug' => $portal->slug,
            'categories' => CategoryResource::collectionFor($portal->categories()->orderBy('position')->get()),
        ];

        $logo = $portal->fileBaseData();
        if ($logo !== null) {
            $payload['logo'] = $logo;
        }

        $payload['meta'] = [
            'articles_count' => $portal->articles()->published()->count(),
            'categories_count' => $portal->categories()->count(),
            'default_locale' => $portal->defaultLocale(),
        ];

        return $payload;
    }
}
