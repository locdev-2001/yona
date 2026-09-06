<?php

namespace App\Http\Resources;

use App\Models\UserSession;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port app/views/api/v1/profile/sessions/index.json.jbuilder.
/** @mixin UserSession */
class UserSessionResource extends JsonResource
{
    public function __construct(UserSession $resource, private readonly ?string $currentClientId = null)
    {
        parent::__construct($resource);
    }

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'browser_name' => $this->browser_name,
            'browser_version' => $this->browser_version,
            'device_name' => $this->device_name,
            'platform_name' => $this->platform_name,
            'platform_version' => $this->platform_version,
            'ip_address' => $this->ip_address,
            'city' => $this->city,
            'country' => $this->country,
            'country_code' => $this->country_code,
            'last_activity_at' => $this->last_activity_at,
            'created_at' => $this->created_at,
            'current' => $this->resource->isCurrent($this->currentClientId),
        ];
    }
}
