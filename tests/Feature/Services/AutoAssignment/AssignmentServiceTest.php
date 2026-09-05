<?php

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\AssignmentPolicy;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\InboxAssignmentPolicy;
use App\Models\Team;
use App\Models\User;
use App\Services\AutoAssignment\AssignmentService;
use App\Support\OnlineStatusTracker;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Redis;

// Port từ spec/services/auto_assignment/assignment_service_spec.rb.
// Bản gốc giả lập RoundRobinSelector/RateLimiter/OnlineStatusTracker; ở đây
// chạy thật qua Redis nên phải bật online SAU khi đã tạo hội thoại, kẻo hook
// auto-assign gán ngay lúc tạo.

beforeEach(function () {
    Redis::flushdb();

    $this->account = Account::factory()->create();
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id, 'enable_auto_assignment' => true]);
    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);
    $this->inbox->inboxMembers()->create(['user_id' => $this->agent->id]);
});

function bringAgentOnline(Account $account, User $user): void
{
    OnlineStatusTracker::updatePresence($account->id, 'User', $user->id);
    OnlineStatusTracker::setStatus($account->id, $user->id, 'online');
}

function openConversation(Inbox $inbox, array $attributes = []): Conversation
{
    return Conversation::factory()->create([
        'account_id' => $inbox->account_id,
        'inbox_id' => $inbox->id,
        'status' => Conversation::STATUS_OPEN,
        ...$attributes,
    ]);
}

function setLastActivityAt(Conversation $conversation, string $ago): void
{
    Conversation::query()->whereKey($conversation->id)->update(['last_activity_at' => now()->sub($ago)]);
}

it('assigns open unassigned conversations to an online agent', function () {
    $conversation = openConversation($this->inbox);
    bringAgentOnline($this->account, $this->agent);

    $assigned = (new AssignmentService($this->inbox))->performBulkAssignment(1);

    expect($assigned)->toBe(1)
        ->and($conversation->refresh()->assignee_id)->toBe($this->agent->id);
});

it('returns zero when no agent is online', function () {
    $conversation = openConversation($this->inbox);

    expect((new AssignmentService($this->inbox))->performBulkAssignment(10))->toBe(0)
        ->and($conversation->refresh()->assignee_id)->toBeNull();
});

it('returns zero when auto assignment is off on the inbox', function () {
    openConversation($this->inbox);
    bringAgentOnline($this->account, $this->agent);
    $this->inbox->update(['enable_auto_assignment' => false]);

    expect((new AssignmentService($this->inbox))->performBulkAssignment(10))->toBe(0);
});

it('returns zero when the account has assignment v2 disabled', function () {
    openConversation($this->inbox);
    bringAgentOnline($this->account, $this->agent);
    $this->account->forceFill(['feature_flags' => ['assignment_v2' => false]])->save();

    expect((new AssignmentService($this->inbox->fresh()))->performBulkAssignment(10))->toBe(0);
});

it('respects the limit', function () {
    collect(range(1, 3))->each(fn () => openConversation($this->inbox));
    bringAgentOnline($this->account, $this->agent);

    expect((new AssignmentService($this->inbox))->performBulkAssignment(2))->toBe(2)
        ->and($this->inbox->conversations()->whereNull('assignee_id')->count())->toBe(1);
});

it('skips conversations that are not open or already assigned', function () {
    $resolved = openConversation($this->inbox, ['status' => Conversation::STATUS_RESOLVED]);
    $assigned = openConversation($this->inbox, ['assignee_id' => $this->agent->id]);
    $open = openConversation($this->inbox);
    bringAgentOnline($this->account, $this->agent);

    expect((new AssignmentService($this->inbox))->performBulkAssignment(10))->toBe(1)
        ->and($resolved->refresh()->assignee_id)->toBeNull()
        ->and($assigned->refresh()->assignee_id)->toBe($this->agent->id)
        ->and($open->refresh()->assignee_id)->toBe($this->agent->id);
});

it('skips conversations inactive beyond the policy threshold', function () {
    $policy = AssignmentPolicy::factory()->create(['account_id' => $this->account->id, 'exclude_older_than_hours' => 24]);
    InboxAssignmentPolicy::factory()->create(['inbox_id' => $this->inbox->id, 'assignment_policy_id' => $policy->id]);
    $stale = openConversation($this->inbox);
    $recent = openConversation($this->inbox);
    setLastActivityAt($stale, '25 hours');
    setLastActivityAt($recent, '1 hour');
    bringAgentOnline($this->account, $this->agent);

    expect((new AssignmentService($this->inbox->fresh()))->performBulkAssignment(10))->toBe(1)
        ->and($stale->refresh()->assignee_id)->toBeNull()
        ->and($recent->refresh()->assignee_id)->toBe($this->agent->id);
});

it('keeps every conversation when the policy threshold is null', function () {
    $policy = AssignmentPolicy::factory()->create(['account_id' => $this->account->id, 'exclude_older_than_hours' => null]);
    InboxAssignmentPolicy::factory()->create(['inbox_id' => $this->inbox->id, 'assignment_policy_id' => $policy->id]);
    $old = openConversation($this->inbox);
    setLastActivityAt($old, '30 days');
    bringAgentOnline($this->account, $this->agent);

    expect((new AssignmentService($this->inbox->fresh()))->performBulkAssignment(10))->toBe(1)
        ->and($old->refresh()->assignee_id)->toBe($this->agent->id);
});

it('falls back to the default threshold without a policy', function () {
    $stale = openConversation($this->inbox);
    $recent = openConversation($this->inbox);
    setLastActivityAt($stale, '8 days');
    setLastActivityAt($recent, '6 days');
    bringAgentOnline($this->account, $this->agent);

    expect((new AssignmentService($this->inbox))->performBulkAssignment(10))->toBe(1)
        ->and($stale->refresh()->assignee_id)->toBeNull()
        ->and($recent->refresh()->assignee_id)->toBe($this->agent->id);
});

it('assigns the longest waiting conversation first when the policy says so', function () {
    $policy = AssignmentPolicy::factory()->create([
        'account_id' => $this->account->id,
        'conversation_priority' => AssignmentPolicy::PRIORITY_LONGEST_WAITING,
    ]);
    InboxAssignmentPolicy::factory()->create(['inbox_id' => $this->inbox->id, 'assignment_policy_id' => $policy->id]);
    $newer = openConversation($this->inbox);
    $older = openConversation($this->inbox);
    setLastActivityAt($newer, '1 hour');
    setLastActivityAt($older, '2 hours');
    bringAgentOnline($this->account, $this->agent);

    (new AssignmentService($this->inbox->fresh()))->performBulkAssignment(1);

    expect($older->refresh()->assignee_id)->toBe($this->agent->id)
        ->and($newer->refresh()->assignee_id)->toBeNull();
});

it('assigns a conversation with a team to a team member', function () {
    $team = Team::factory()->create(['account_id' => $this->account->id, 'allow_auto_assign' => true]);
    $team->addMembers([$this->agent->id]);
    $conversation = openConversation($this->inbox, ['team_id' => $team->id]);
    bringAgentOnline($this->account, $this->agent);

    expect((new AssignmentService($this->inbox))->performBulkAssignment(1))->toBe(1)
        ->and($conversation->refresh()->assignee_id)->toBe($this->agent->id);
});

it('skips a conversation whose team blocks auto assignment', function () {
    $team = Team::factory()->create(['account_id' => $this->account->id, 'allow_auto_assign' => false]);
    $team->addMembers([$this->agent->id]);
    $conversation = openConversation($this->inbox, ['team_id' => $team->id]);
    bringAgentOnline($this->account, $this->agent);

    expect((new AssignmentService($this->inbox))->performBulkAssignment(1))->toBe(0)
        ->and($conversation->refresh()->assignee_id)->toBeNull();
});

it('skips agents that are over the rate limit', function () {
    $policy = AssignmentPolicy::factory()->create(['account_id' => $this->account->id, 'fair_distribution_limit' => 1]);
    InboxAssignmentPolicy::factory()->create(['inbox_id' => $this->inbox->id, 'assignment_policy_id' => $policy->id]);
    openConversation($this->inbox);
    openConversation($this->inbox);
    bringAgentOnline($this->account, $this->agent);

    $service = new AssignmentService($this->inbox->fresh());

    expect($service->performBulkAssignment(10))->toBe(1)
        ->and($service->performBulkAssignment(10))->toBe(0);
});

it('dispatches assignee changed for every assignment it makes', function () {
    $conversation = openConversation($this->inbox);
    bringAgentOnline($this->account, $this->agent);
    Event::fake([DomainEvent::class]);

    (new AssignmentService($this->inbox))->performBulkAssignment(1);

    Event::assertDispatched(DomainEvent::class, fn (DomainEvent $event) => $event->type === EventType::ASSIGNEE_CHANGED
        && $event->data['conversation']->id === $conversation->id
        && ($event->data['user'] ?? null)?->id === $this->agent->id);
});

it('names the assignment policy as the activity author', function () {
    $policy = AssignmentPolicy::factory()->create(['account_id' => $this->account->id, 'name' => 'Support policy']);
    InboxAssignmentPolicy::factory()->create(['inbox_id' => $this->inbox->id, 'assignment_policy_id' => $policy->id]);
    $conversation = openConversation($this->inbox);
    bringAgentOnline($this->account, $this->agent);

    (new AssignmentService($this->inbox->fresh()))->performBulkAssignment(1);

    expect($conversation->messages()->reorder('id', 'desc')->first()->content)
        ->toBe("Assigned to {$this->agent->name} by Automation System via Support policy");
});

it('names the inbox default policy when the inbox has none', function () {
    $conversation = openConversation($this->inbox);
    bringAgentOnline($this->account, $this->agent);

    (new AssignmentService($this->inbox))->performBulkAssignment(1);

    expect($conversation->messages()->reorder('id', 'desc')->first()->content)
        ->toBe("Assigned to {$this->agent->name} by Default Policy");
});
