<?php

namespace App\Http\Resources\Search;

use App\Models\AccountUser;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/accounts/search/_agent.json.jbuilder.
class SearchAgentResource extends JsonResource
{
    public function __construct(User $resource, private readonly int $accountId)
    {
        parent::__construct($resource);
    }

    public function toArray(Request $request): array
    {
        /** @var User $agent */
        $agent = $this->resource;

        return [
            'id' => $agent->id,
            'available_name' => $agent->availableName(),
            'email' => $agent->email,
            'name' => $agent->name,
            'role' => $this->membership($agent)?->roleName() ?? 'agent',
        ];
    }

    private function membership(User $agent): ?AccountUser
    {
        return $agent->accountUsers->firstWhere('account_id', $this->accountId);
    }
}
