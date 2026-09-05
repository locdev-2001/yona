<?php

use App\Models\Account;
use App\Models\AssignmentPolicy;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\InboxAssignmentPolicy;
use App\Models\User;
use App\Services\AutoAssignment\RateLimiter;
use Illuminate\Support\Facades\Redis;

// Port từ spec/services/auto_assignment/rate_limiter_spec.rb.

beforeEach(function () {
    Redis::flushdb();

    $this->account = Account::factory()->create();
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $this->agent = User::factory()->create();
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
    ]);
});

function attachAssignmentPolicy(Inbox $inbox, array $attributes = []): AssignmentPolicy
{
    $policy = AssignmentPolicy::factory()->create([...$attributes, 'account_id' => $inbox->account_id]);
    InboxAssignmentPolicy::factory()->create(['inbox_id' => $inbox->id, 'assignment_policy_id' => $policy->id]);

    return $policy;
}

it('is within limit when the inbox has no assignment policy', function () {
    expect((new RateLimiter($this->inbox, $this->agent))->withinLimit())->toBeTrue();
});

it('tracks the assignment with the default window when no policy is set', function () {
    (new RateLimiter($this->inbox, $this->agent))->trackAssignment($this->conversation);

    $key = sprintf(RateLimiter::ASSIGNMENT_KEY, $this->inbox->id, $this->agent->id, $this->conversation->id);

    expect(Redis::get($key))->toBe((string) $this->conversation->id)
        ->and(Redis::ttl($key))->toBeGreaterThan(0)
        ->and(Redis::ttl($key))->toBeLessThanOrEqual(RateLimiter::DEFAULT_WINDOW_SECONDS);
});

it('uses the policy window when a policy is attached', function () {
    attachAssignmentPolicy($this->inbox, ['fair_distribution_window' => 7200]);
    $this->inbox->refresh();

    (new RateLimiter($this->inbox, $this->agent))->trackAssignment($this->conversation);

    $key = sprintf(RateLimiter::ASSIGNMENT_KEY, $this->inbox->id, $this->agent->id, $this->conversation->id);

    expect(Redis::ttl($key))->toBeGreaterThan(RateLimiter::DEFAULT_WINDOW_SECONDS);
});

it('counts only the keys of the same inbox and agent', function () {
    attachAssignmentPolicy($this->inbox, ['fair_distribution_limit' => 2]);
    $this->inbox->refresh();
    $otherAgent = User::factory()->create();

    $limiter = new RateLimiter($this->inbox, $this->agent);
    $limiter->trackAssignment($this->conversation);
    (new RateLimiter($this->inbox, $otherAgent))->trackAssignment($this->conversation);

    expect($limiter->currentCount())->toBe(1)
        ->and($limiter->withinLimit())->toBeTrue();
});

it('stops being within limit once the policy limit is reached', function () {
    attachAssignmentPolicy($this->inbox, ['fair_distribution_limit' => 1]);
    $this->inbox->refresh();

    $limiter = new RateLimiter($this->inbox, $this->agent);
    $limiter->trackAssignment($this->conversation);

    expect($limiter->currentCount())->toBe(1)
        ->and($limiter->withinLimit())->toBeFalse();
});
