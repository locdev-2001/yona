<?php

namespace App\Http\Resources;

use App\Models\AccountInviteLink;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Không lộ token_digest lẫn token thật — token thật chỉ trả một lần lúc tạo
// (InviteLinksController::store), resource này chỉ phục vụ danh sách quản lý.
class AccountInviteLinkResource extends JsonResource
{
    public function __construct(AccountInviteLink $resource)
    {
        parent::__construct($resource);
    }

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
            'uses_left' => $link->usesLeft(),
            'revoked_at' => $link->revoked_at?->toIso8601String(),
            'created_at' => $link->created_at->toIso8601String(),
            'created_by_name' => $link->creator?->availableName(),
        ];
    }
}
