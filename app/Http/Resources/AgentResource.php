<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\SerializesAttributeMaps;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/models/_agent.json.jbuilder — partial dùng chung cho agents
// và team_members, nên payload agent chỉ định nghĩa ở đây.
// Bỏ: custom_role_id (EE).
class AgentResource extends JsonResource
{
    use SerializesAttributeMaps;

    public function __construct(User $resource, private readonly Account $account)
    {
        parent::__construct($resource);
    }

    /** @param iterable<User> $agents */
    public static function forAccount(iterable $agents, Account $account): array
    {
        return collect($agents)
            ->map(fn (User $agent) => (new self($agent, $account))->toArray(request()))
            ->values()
            ->all();
    }

    public function toArray(Request $request): array
    {
        /** @var User $agent */
        $agent = $this->resource;
        $membership = $this->membershipOf($agent);

        return [
            'id' => $agent->id,
            'account_id' => $this->account->id,
            'availability_status' => $membership?->availabilityStatus() ?? 'offline',
            'auto_offline' => $membership?->auto_offline ?? false,
            'confirmed' => $agent->isConfirmed(),
            'email' => $agent->email,
            'provider' => $agent->provider,
            'available_name' => $agent->availableName(),
            'custom_attributes' => self::attributeMap($agent->custom_attributes),
            'name' => $agent->name,
            'role' => $membership?->roleName() ?? 'agent',
            'thumbnail' => $agent->avatarUrl(),
        ];
    }

    private function membershipOf(User $agent): ?AccountUser
    {
        if ($agent->relationLoaded('accountUsers')) {
            return $agent->accountUsers->firstWhere('account_id', $this->account->id);
        }

        return $agent->accountUsers()->where('account_id', $this->account->id)->first();
    }
}
