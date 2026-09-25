<?php

namespace App\Http\Resources;

use App\Models\AccountInviteLink;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AccountInviteLinkResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var AccountInviteLink $link */
        $link = $this->resource;

        return [
            'id' => $link->id,
            'role' => $link->roleName(),
            'status' => $link->status(),
            'expires_at' => $link->expires_at->toIso8601String(),
            'max_uses' => $link->max_uses,
            'use_count' => $link->use_count,
            'revoked_at' => $link->revoked_at?->toIso8601String(),
            'created_by_name' => $link->creator?->availableName(),
        ];
    }
}
