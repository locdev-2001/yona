<?php

use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\Team;
use App\Models\User;
use Carbon\Carbon;

// Port từ spec/controllers/api/v2/accounts/summary_reports_controller_spec.rb.

beforeEach(function () {
    $this->inbox = Inbox::factory()->create();
    $this->account = $this->inbox->account;

    $this->admin = User::factory()->create();
    AccountUser::factory()->administrator()->create(['account_id' => $this->account->id, 'user_id' => $this->admin->id]);

    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);

    $this->team = Team::factory()->create(['account_id' => $this->account->id]);
    // Conversation#ensure_assignee_is_from_team gỡ assignee không thuộc team.
    $this->team->members()->attach($this->agent->id);
    $this->url = "/api/v2/accounts/{$this->account->id}/summary_reports";

    Carbon::setTestNow('2026-09-01 10:00:00');
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'assignee_id' => $this->agent->id,
        'team_id' => $this->team->id,
    ]);

    Carbon::setTestNow('2026-09-01 10:02:00');
    Message::factory()->outgoing()->create([
        'account_id' => $this->account->id,
        'conversation_id' => $this->conversation->id,
        'inbox_id' => $this->inbox->id,
        'sender_type' => 'User',
        'sender_id' => $this->agent->id,
    ]);

    Carbon::setTestNow('2026-09-01 10:05:00');
    $this->conversation->refresh()->update(['status' => Conversation::STATUS_RESOLVED]);

    Carbon::setTestNow('2026-09-02 00:00:00');

    $this->range = [
        'since' => (string) Carbon::parse('2026-09-01 00:00:00')->getTimestamp(),
        'until' => (string) Carbon::parse('2026-09-02 00:00:00')->getTimestamp(),
    ];
});

afterEach(fn () => Carbon::setTestNow());

it('rejects agents', function () {
    $this->actingAs($this->agent)->getJson($this->url.'/agent?'.http_build_query($this->range))->assertUnauthorized();
});

it('summarises every agent of the account', function () {
    $payload = $this->actingAs($this->admin)
        ->getJson($this->url.'/agent?'.http_build_query($this->range))
        ->assertOk()
        ->json();

    $agentRow = collect($payload)->firstWhere('id', $this->agent->id);
    $adminRow = collect($payload)->firstWhere('id', $this->admin->id);

    expect($agentRow['conversations_count'])->toBe(1)
        ->and($agentRow['resolved_conversations_count'])->toBe(1)
        ->and($agentRow['avg_first_response_time'])->toEqual(120.0)
        ->and($agentRow['avg_resolution_time'])->toEqual(300.0)
        ->and($adminRow['conversations_count'])->toBe(0)
        ->and($adminRow['avg_resolution_time'])->toBeNull();
});

it('summarises inboxes', function () {
    $payload = $this->actingAs($this->admin)
        ->getJson($this->url.'/inbox?'.http_build_query($this->range))
        ->assertOk()
        ->json();

    expect($payload[0]['id'])->toBe($this->inbox->id)
        ->and($payload[0]['conversations_count'])->toBe(1)
        ->and($payload[0]['resolved_conversations_count'])->toBe(1);
});

it('summarises teams', function () {
    $payload = $this->actingAs($this->admin)
        ->getJson($this->url.'/team?'.http_build_query($this->range))
        ->assertOk()
        ->json();

    expect($payload[0]['id'])->toBe($this->team->id)
        ->and($payload[0]['conversations_count'])->toBe(1)
        ->and($payload[0]['resolved_conversations_count'])->toBe(1);
});

it('summarises labels', function () {
    $this->account->labels()->create(['title' => 'billing']);
    $this->conversation->refresh()->addLabels(['billing']);

    $payload = $this->actingAs($this->admin)
        ->getJson($this->url.'/label?'.http_build_query($this->range))
        ->assertOk()
        ->json();

    expect($payload[0]['name'])->toBe('billing')
        ->and($payload[0]['conversations_count'])->toBe(1)
        ->and($payload[0]['resolved_conversations_count'])->toBe(1)
        ->and($payload[0]['avg_resolution_time'])->toEqual(300.0);
});

it('summarises channels by status', function () {
    $payload = $this->actingAs($this->admin)
        ->getJson($this->url.'/channel?'.http_build_query($this->range))
        ->assertOk()
        ->json();

    expect($payload[$this->inbox->channel_type])->toBe([
        'open' => 0,
        'resolved' => 1,
        'pending' => 0,
        'snoozed' => 0,
        'total' => 1,
    ]);
});

it('refuses a channel range longer than six months', function () {
    $this->actingAs($this->admin)
        ->getJson($this->url.'/channel?'.http_build_query([
            'since' => (string) Carbon::parse('2025-01-01 00:00:00')->getTimestamp(),
            'until' => (string) Carbon::parse('2026-01-01 00:00:00')->getTimestamp(),
        ]))
        ->assertStatus(422)
        ->assertJson(['error' => 'Date range cannot exceed 6 months']);
});
