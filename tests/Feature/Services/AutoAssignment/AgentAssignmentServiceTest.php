<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\InboxMember;
use App\Models\User;
use App\Services\AutoAssignment\AgentAssignmentService;
use App\Support\OnlineStatusTracker;
use Illuminate\Support\Facades\Redis;

// Port từ spec/services/auto_assignment/agent_assignment_service_spec.rb —
// bản gốc giả lập OnlineStatusTracker, ở đây ghi presence thật vào Redis.

beforeEach(function () {
    Redis::flushdb();
});

function markAgentStatus(Account $account, User $user, string $status): void
{
    OnlineStatusTracker::updatePresence($account->id, 'User', $user->id);
    OnlineStatusTracker::setStatus($account->id, $user->id, $status);
}

/** @return array{0: Account, 1: Inbox, 2: Conversation, 3: list<InboxMember>} */
function agentAssignmentFixtures(): array
{
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->create(['account_id' => $account->id, 'enable_auto_assignment' => false]);

    $members = collect(range(0, 4))->map(function (int $index) use ($account, $inbox) {
        $user = User::factory()->create();
        AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id]);
        markAgentStatus($account, $user, $index < 3 ? 'busy' : 'online');

        return $inbox->inboxMembers()->create(['user_id' => $user->id]);
    })->all();

    $conversation = Conversation::factory()->create(['account_id' => $account->id, 'inbox_id' => $inbox->id]);

    return [$account, $inbox, $conversation, $members];
}

it('picks online agents in round robin order', function () {
    [, , $conversation, $members] = agentAssignmentFixtures();
    $allowedAgentIds = array_map(fn (InboxMember $member) => $member->user_id, $members);

    $first = (new AgentAssignmentService($conversation, $allowedAgentIds))->findAssignee();
    $second = (new AgentAssignmentService($conversation, $allowedAgentIds))->findAssignee();

    expect($first->id)->toBe($members[3]->user_id)
        ->and($second->id)->toBe($members[4]->user_id);
});

it('never picks an agent who is busy', function () {
    [, , $conversation, $members] = agentAssignmentFixtures();
    $busyIds = [$members[0]->user_id, $members[1]->user_id, $members[2]->user_id];

    expect((new AgentAssignmentService($conversation, $busyIds))->findAssignee())->toBeNull();
});

it('assigns an online agent to the conversation', function () {
    [, , $conversation, $members] = agentAssignmentFixtures();

    expect($conversation->refresh()->assignee_id)->toBeNull();

    (new AgentAssignmentService($conversation, array_map(fn (InboxMember $member) => $member->user_id, $members)))->perform();

    expect($conversation->refresh()->assignee_id)->toBe($members[3]->user_id);
});

it('leaves the conversation alone when the assignee is still an inbox member', function () {
    [, , $conversation, $members] = agentAssignmentFixtures();
    $conversation->update(['assignee_id' => $members[0]->user_id]);

    (new AgentAssignmentService($conversation, array_map(fn (InboxMember $member) => $member->user_id, $members)))->perform();

    expect($conversation->refresh()->assignee_id)->toBe($members[0]->user_id);
});

it('drops a status change a concurrent writer already committed', function () {
    [, , $conversation, $members] = agentAssignmentFixtures();
    $stale = Conversation::query()->find($conversation->id);
    $conversation->update(['status' => Conversation::STATUS_RESOLVED]);

    $stale->status = Conversation::STATUS_RESOLVED;
    (new AgentAssignmentService($stale, array_map(fn (InboxMember $member) => $member->user_id, $members)))->assignUnderLock();

    expect($stale->isDirty('status'))->toBeFalse()
        ->and($stale->isDirty('assignee_id'))->toBeTrue();
});
