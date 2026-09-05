<?php

use App\Models\Account;
use App\Models\Inbox;
use App\Models\InboxMember;
use App\Models\User;
use App\Services\AutoAssignment\InboxRoundRobinService;
use Illuminate\Support\Facades\Redis;

// Port từ spec/services/auto_assignment/inbox_round_robin_service_spec.rb.

beforeEach(function () {
    Redis::flushdb();
});

function roundRobinQueue(Inbox $inbox): array
{
    return array_map('strval', Redis::lrange(sprintf(InboxRoundRobinService::ROUND_ROBIN_AGENTS, $inbox->id), 0, -1));
}

/** @return array{0: Inbox, 1: list<InboxMember>} */
function roundRobinFixtures(int $memberCount = 5): array
{
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);

    $members = collect(range(1, $memberCount))
        ->map(fn () => $inbox->inboxMembers()->create(['user_id' => User::factory()->create()->id]))
        ->all();

    return [$inbox, $members];
}

it('returns null when allowed agent ids are empty', function () {
    [$inbox] = roundRobinFixtures();

    expect((new InboxRoundRobinService($inbox))->availableAgent())->toBeNull();
});

it('takes the oldest allowed agent and moves it to the front of the queue', function () {
    [$inbox, $members] = roundRobinFixtures();

    (new InboxRoundRobinService($inbox))->availableAgent([
        (string) $members[0]->user_id,
        (string) $members[4]->user_id,
    ]);

    expect(roundRobinQueue($inbox))->toBe(array_map('strval', [
        $members[0]->user_id, $members[4]->user_id, $members[3]->user_id, $members[2]->user_id, $members[1]->user_id,
    ]));
});

it('rebuilds the queue when it is missing', function () {
    [$inbox, $members] = roundRobinFixtures();
    $service = new InboxRoundRobinService($inbox);
    $service->clearQueue();

    expect(roundRobinQueue($inbox))->toBe([]);

    $service->availableAgent();

    expect(array_map('intval', roundRobinQueue($inbox)))
        ->toEqualCanonicalizing(array_map(fn (InboxMember $member) => $member->user_id, $members));
});

it('keeps the queue empty when the inbox has no members', function () {
    $inbox = Inbox::factory()->create();
    $service = new InboxRoundRobinService($inbox);
    $service->addAgentToQueue(-1);

    expect($service->availableAgent())->toBeNull()
        ->and(roundRobinQueue($inbox))->toBe([]);
});

it('corrects a queue holding unknown ids before picking', function () {
    [$inbox, $members] = roundRobinFixtures();
    $service = new InboxRoundRobinService($inbox);
    $service->addAgentToQueue([2000001, 2000002]);

    $service->availableAgent();

    expect(array_map('intval', roundRobinQueue($inbox)))
        ->toEqualCanonicalizing(array_map(fn (InboxMember $member) => $member->user_id, $members));
});

it('rotates through the allowed agents on repeated calls', function () {
    [$inbox, $members] = roundRobinFixtures();
    $allowed = [(string) $members[3]->user_id, (string) $members[2]->user_id];

    $first = (new InboxRoundRobinService($inbox))->availableAgent($allowed);
    $second = (new InboxRoundRobinService($inbox))->availableAgent($allowed);

    expect($first)->toBeInstanceOf(User::class)
        ->and($first->id)->toBe($members[2]->user_id)
        ->and($second->id)->toBe($members[3]->user_id)
        ->and(roundRobinQueue($inbox))->toBe(array_map('strval', [
            $members[3]->user_id, $members[2]->user_id, $members[4]->user_id, $members[1]->user_id, $members[0]->user_id,
        ]));
});

it('adds and removes agents from the queue when membership changes', function () {
    [$inbox, $members] = roundRobinFixtures(2);

    expect(array_map('intval', roundRobinQueue($inbox)))
        ->toBe([$members[1]->user_id, $members[0]->user_id]);

    $inbox->removeMembers([$members[1]->user_id]);

    expect(array_map('intval', roundRobinQueue($inbox)))->toBe([$members[0]->user_id]);

    $inbox->delete();

    expect(roundRobinQueue($inbox))->toBe([]);
});
