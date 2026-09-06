<?php

use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;
use Carbon\Carbon;

// Port từ spec/controllers/api/v2/accounts/{report,reports}_controller_spec.rb.
// Kịch bản gốc dùng để đối chiếu số với oracle: 3 hội thoại tạo lúc 10:00 ngày
// 01/09/2026 (UTC), agent trả lời sau 2 phút, hai hội thoại được đóng sau 5 phút.

beforeEach(function () {
    $this->inbox = Inbox::factory()->create();
    $this->account = $this->inbox->account;

    $this->admin = User::factory()->create();
    AccountUser::factory()->administrator()->create(['account_id' => $this->account->id, 'user_id' => $this->admin->id]);

    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);

    $this->url = "/api/v2/accounts/{$this->account->id}/reports";
});

function d2SeedScenario(): void
{
    Carbon::setTestNow('2026-09-01 10:00:00');

    $conversations = collect(range(1, 3))->map(fn () => Conversation::factory()->create([
        'account_id' => test()->account->id,
        'inbox_id' => test()->inbox->id,
        'assignee_id' => test()->agent->id,
    ]));

    Carbon::setTestNow('2026-09-01 10:02:00');

    $conversations->each(fn (Conversation $conversation) => Message::factory()->outgoing()->create([
        'account_id' => test()->account->id,
        'conversation_id' => $conversation->id,
        'inbox_id' => test()->inbox->id,
        'sender_type' => 'User',
        'sender_id' => test()->agent->id,
    ]));

    Carbon::setTestNow('2026-09-01 10:05:00');

    $conversations->take(2)->each(fn (Conversation $conversation) => $conversation->refresh()->update([
        'status' => Conversation::STATUS_RESOLVED,
    ]));

    Carbon::setTestNow('2026-09-02 00:00:00');
}

afterEach(fn () => Carbon::setTestNow());

function d2Range(): array
{
    return ['since' => (string) Carbon::parse('2026-09-01 00:00:00')->getTimestamp(), 'until' => (string) Carbon::parse('2026-09-02 00:00:00')->getTimestamp()];
}

it('rejects agents', function () {
    $this->actingAs($this->agent)
        ->getJson($this->url.'?'.http_build_query(d2Range() + ['metric' => 'conversations_count', 'type' => 'account']))
        ->assertUnauthorized();
});

it('returns a daily conversations_count series covering the whole range', function () {
    d2SeedScenario();

    $payload = $this->actingAs($this->admin)
        ->getJson($this->url.'?'.http_build_query(d2Range() + ['metric' => 'conversations_count', 'type' => 'account']))
        ->assertOk()
        ->json();

    expect($payload)->toHaveCount(1)
        ->and($payload[0]['value'])->toBe(3)
        ->and($payload[0]['timestamp'])->toBe(Carbon::parse('2026-09-01 00:00:00')->getTimestamp());
});

it('fills empty buckets with zero', function () {
    d2SeedScenario();

    $payload = $this->actingAs($this->admin)
        ->getJson($this->url.'?'.http_build_query([
            'metric' => 'conversations_count',
            'type' => 'account',
            'since' => (string) Carbon::parse('2026-08-30 00:00:00')->getTimestamp(),
            'until' => (string) Carbon::parse('2026-09-02 00:00:00')->getTimestamp(),
        ]))
        ->assertOk()
        ->json();

    expect(array_column($payload, 'value'))->toBe([0, 0, 3]);
});

it('returns average metrics with the number of events behind each bucket', function () {
    d2SeedScenario();

    $payload = $this->actingAs($this->admin)
        ->getJson($this->url.'?'.http_build_query(d2Range() + ['metric' => 'avg_first_response_time', 'type' => 'account']))
        ->assertOk()
        ->json();

    // JSON của PHP in 120 thay vì 120.0 như Ruby — cùng một số với client JS.
    expect($payload[0]['value'])->toEqual(120.0)->and($payload[0]['count'])->toBe(3);
});

it('logs and returns an empty body for an unknown metric', function () {
    $payload = $this->actingAs($this->admin)
        ->getJson($this->url.'?'.http_build_query(d2Range() + ['metric' => 'unknown_metric', 'type' => 'account']))
        ->assertOk()
        ->json();

    expect($payload)->toBe([]);
});

it('summarises the range and the previous range of the same length', function () {
    d2SeedScenario();

    $payload = $this->actingAs($this->admin)
        ->getJson($this->url.'/summary?'.http_build_query(d2Range() + ['type' => 'account']))
        ->assertOk()
        ->json();

    expect($payload['conversations_count'])->toBe(3)
        ->and($payload['outgoing_messages_count'])->toBe(3)
        ->and($payload['resolutions_count'])->toBe(2)
        ->and($payload['avg_first_response_time'])->toEqual(120.0)
        ->and($payload['avg_resolution_time'])->toEqual(300.0)
        ->and($payload['previous']['conversations_count'])->toBe(0);
});

it('splits the timeseries by inbox when a dimension is given', function () {
    d2SeedScenario();
    $otherInbox = Inbox::factory()->create(['account_id' => $this->account->id]);

    $payload = $this->actingAs($this->admin)
        ->getJson($this->url.'?'.http_build_query(d2Range() + [
            'metric' => 'conversations_count',
            'type' => 'inbox',
            'id' => $otherInbox->id,
        ]))
        ->assertOk()
        ->json();

    expect($payload[0]['value'])->toBe(0);
});

it('reports live conversation counts for the account', function () {
    d2SeedScenario();

    $payload = $this->actingAs($this->admin)
        ->getJson($this->url.'/conversations?type=account')
        ->assertOk()
        ->json();

    expect($payload['open'])->toBe(1)->and($payload['unassigned'])->toBe(0);
});

it('rejects the conversations endpoint without a type', function () {
    $this->actingAs($this->admin)->getJson($this->url.'/conversations')->assertStatus(422);
});

it('lists the records behind a bucket in the drilldown', function () {
    d2SeedScenario();

    $payload = $this->actingAs($this->admin)
        ->getJson($this->url.'/drilldown?'.http_build_query(d2Range() + [
            'metric' => 'conversations_count',
            'type' => 'account',
            'group_by' => 'day',
            'bucket_timestamp' => (string) Carbon::parse('2026-09-01 00:00:00')->getTimestamp(),
        ]))
        ->assertOk()
        ->json();

    expect($payload['meta']['total_count'])->toBe(3)
        ->and($payload['meta']['record_type'])->toBe('conversation')
        ->and($payload['payload'])->toHaveCount(3)
        ->and($payload['payload'][0]['conversation']['inbox_id'])->toBe($this->inbox->id);
});

it('rejects a drilldown bucket outside the requested range', function () {
    $this->actingAs($this->admin)
        ->getJson($this->url.'/drilldown?'.http_build_query(d2Range() + [
            'metric' => 'conversations_count',
            'bucket_timestamp' => (string) Carbon::parse('2026-09-05 00:00:00')->getTimestamp(),
        ]))
        ->assertStatus(422);
});

it('groups outgoing messages by agent', function () {
    d2SeedScenario();

    $payload = $this->actingAs($this->admin)
        ->getJson($this->url.'/outgoing_messages_count?'.http_build_query(d2Range() + ['group_by' => 'agent']))
        ->assertOk()
        ->json();

    expect($payload)->toHaveCount(1)
        ->and($payload[0]['id'])->toBe($this->agent->id)
        ->and($payload[0]['outgoing_messages_count'])->toBe(3);
});

it('rejects an unsupported outgoing messages grouping', function () {
    $this->actingAs($this->admin)
        ->getJson($this->url.'/outgoing_messages_count?group_by=contact')
        ->assertStatus(422);
});

it('buckets first response times by channel', function () {
    d2SeedScenario();

    $payload = $this->actingAs($this->admin)
        ->getJson($this->url.'/first_response_time_distribution?'.http_build_query(d2Range()))
        ->assertOk()
        ->json();

    expect($payload[$this->inbox->channel_type]['0-1h'])->toBe(3);
});

it('builds the inbox by label matrix', function () {
    d2SeedScenario();
    $label = $this->account->labels()->create(['title' => 'billing']);
    Conversation::where('account_id', $this->account->id)->first()->addLabels(['billing']);

    $payload = $this->actingAs($this->admin)
        ->getJson($this->url.'/inbox_label_matrix?'.http_build_query(d2Range()))
        ->assertOk()
        ->json();

    expect($payload['labels'][0]['id'])->toBe($label->id)
        ->and($payload['matrix'][0][0])->toBe(1);
});

it('downloads the conversations summary as csv', function () {
    d2SeedScenario();

    $response = $this->actingAs($this->admin)
        ->get($this->url.'/conversations_summary?'.http_build_query(d2Range()))
        ->assertOk();

    expect($response->headers->get('content-type'))->toContain('text/csv');
    expect($response->streamedContent())->toContain('2 minutes');
});

it('reports zero bot metrics when no inbox has an active bot', function () {
    d2SeedScenario();

    $payload = $this->actingAs($this->admin)
        ->getJson($this->url.'/bot_metrics?'.http_build_query(d2Range()))
        ->assertOk()
        ->json();

    expect($payload)->toBe([
        'conversation_count' => 0,
        'message_count' => 0,
        'resolution_rate' => 0,
        'handoff_rate' => 0,
    ]);
});
