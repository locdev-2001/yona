<?php

namespace App\Services\AutoAssignment;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Models\AssignmentPolicy;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\InboxMember;
use App\Models\User;
use App\Support\CurrentExecutedBy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

// Port từ refs/chatwoot/app/services/auto_assignment/assignment_service.rb —
// phân công hàng loạt (V2) cho các hội thoại đang mở chưa có người nhận.
final class AssignmentService
{
    public function __construct(private readonly Inbox $inbox) {}

    public function performBulkAssignment(int $limit = 100): int
    {
        if (! $this->inbox->autoAssignmentV2Enabled() || ! $this->inbox->enable_auto_assignment) {
            return 0;
        }

        $conversations = $this->unassignedConversations($limit)->get();

        if ($conversations->isEmpty() || $this->inbox->availableAgents()->isEmpty()) {
            return 0;
        }

        return $conversations
            ->filter(fn (Conversation $conversation) => $this->performForConversation($conversation))
            ->count();
    }

    private function performForConversation(Conversation $conversation): bool
    {
        if (! $this->isAssignable($conversation)) {
            return false;
        }

        $agent = $this->findAvailableAgent($conversation);

        return $agent !== null && $this->assignConversation($conversation, $agent);
    }

    private function isAssignable(Conversation $conversation): bool
    {
        return $conversation->status === Conversation::STATUS_OPEN && $conversation->assignee_id === null;
    }

    /** @return Builder<Conversation> */
    private function unassignedConversations(int $limit): Builder
    {
        $policy = $this->inbox->assignmentPolicy;

        $query = $this->inbox->conversations()->getQuery()
            ->unassigned()
            ->where('conversations.status', Conversation::STATUS_OPEN);

        $this->applyAgeExclusion($query, $this->ageExclusionHours($policy));

        // last_activity_at để hội thoại mở lại không bị loại theo created_at cũ.
        return $policy?->isLongestWaiting() === true
            ? $query->reorder('conversations.last_activity_at')->orderBy('conversations.created_at')->limit($limit)
            : $query->reorder('conversations.created_at')->limit($limit);
    }

    private function ageExclusionHours(?AssignmentPolicy $policy): ?int
    {
        if ($policy !== null) {
            return $policy->exclude_older_than_hours === null ? null : (int) $policy->exclude_older_than_hours;
        }

        return AssignmentPolicy::DEFAULT_EXCLUDE_OLDER_THAN_HOURS;
    }

    /** @param Builder<Conversation> $query */
    private function applyAgeExclusion(Builder $query, ?int $hours): void
    {
        if ($hours === null || $hours <= 0) {
            return;
        }

        $query->where('conversations.last_activity_at', '>=', now()->subHours($hours));
    }

    private function findAvailableAgent(Conversation $conversation): ?User
    {
        $agents = $this->filterAgentsByTeam($this->inbox->availableAgents(), $conversation);

        if ($agents === null) {
            return null;
        }

        $agents = $agents->filter(fn (InboxMember $member) => (new RateLimiter($this->inbox, $member->user))->withinLimit())->values();

        return $agents->isEmpty() ? null : (new RoundRobinSelector($this->inbox))->selectAgent($agents);
    }

    /**
     * @param  Collection<int, InboxMember>  $agents
     * @return Collection<int, InboxMember>|null null = team chặn phân công tự động
     */
    private function filterAgentsByTeam(Collection $agents, Conversation $conversation): ?Collection
    {
        if ($conversation->team_id === null) {
            return $agents;
        }

        $team = $conversation->team;

        if ($team === null || ! $team->allow_auto_assign) {
            return null;
        }

        $teamMemberIds = $team->members()->pluck('users.id')->all();

        return $agents->filter(fn (InboxMember $member) => in_array($member->user_id, $teamMemberIds, false))->values();
    }

    private function assignConversation(Conversation $conversation, User $agent): bool
    {
        if (! $this->claimAndAssign($conversation, $agent)) {
            return false;
        }

        $conversation->refresh();

        (new RateLimiter($this->inbox, $agent))->trackAssignment($conversation);

        DomainEvent::dispatch(EventType::ASSIGNEE_CHANGED, [
            'conversation' => $conversation,
            'user' => $agent,
        ]);

        return true;
    }

    // Giành hàng một cách nguyên tử để hai lượt chạy chồng nhau (cổng in-flight
    // chỉ là best-effort, có thể hết hạn) không cùng gán một hội thoại.
    private function claimAndAssign(Conversation $conversation, User $agent): bool
    {
        return CurrentExecutedBy::run($this->inbox->assignmentPolicy ?? $this->inbox, fn () => DB::transaction(function () use ($conversation, $agent) {
            $locked = $this->inbox->conversations()
                ->whereKey($conversation->id)
                ->unassigned()
                ->lock('for update skip locked')
                ->first();

            if ($locked === null) {
                return false;
            }

            $locked->update(['assignee_id' => $agent->id]);

            return true;
        }));
    }
}
