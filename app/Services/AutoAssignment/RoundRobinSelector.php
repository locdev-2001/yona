<?php

namespace App\Services\AutoAssignment;

use App\Models\Inbox;
use App\Models\InboxMember;
use App\Models\User;
use Illuminate\Support\Collection;

final class RoundRobinSelector
{
    public function __construct(private readonly Inbox $inbox) {}

    /** @param Collection<int, InboxMember> $availableAgents */
    public function selectAgent(Collection $availableAgents): ?User
    {
        if ($availableAgents->isEmpty()) {
            return null;
        }

        $agentUserIds = $availableAgents->map(fn (InboxMember $member) => (string) $member->user_id)->values()->all();

        return (new InboxRoundRobinService($this->inbox))->availableAgent($agentUserIds);
    }
}
