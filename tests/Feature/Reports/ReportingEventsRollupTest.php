<?php

use App\Models\Account;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\ReportingEvent;
use App\Models\ReportingEventsRollup;
use App\Models\User;
use App\Services\ReportingEvents\BackfillService;
use App\Services\ReportingEvents\RollupService;
use Carbon\Carbon;

// Port từ spec/services/reporting_events/{rollup_service,backfill_service,event_metric_registry}_spec.rb.

beforeEach(function () {
    $this->inbox = Inbox::factory()->create();
    $this->account = $this->inbox->account;
    $this->account->update(['settings' => ['reporting_timezone' => 'Asia/Bangkok']]);
    $this->agent = User::factory()->create();
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'assignee_id' => $this->agent->id,
    ]);
    ReportingEvent::query()->delete();
    ReportingEventsRollup::query()->delete();
});

function d2RollupEvent(string $name, float $value, ?string $createdAt = null): ReportingEvent
{
    $event = ReportingEvent::factory()->forConversation(test()->conversation, [
        'name' => $name,
        'value' => $value,
        'value_in_business_hours' => $value / 2,
    ])->create();

    if ($createdAt !== null) {
        $event->forceFill(['created_at' => $createdAt])->saveQuietly();
    }

    return $event->refresh();
}

it('writes one rollup row per dimension for a resolved event', function () {
    RollupService::perform(d2RollupEvent(ReportingEvent::NAME_CONVERSATION_RESOLVED, 600));

    // 3 chiều (account, agent, inbox) × 2 chỉ số (resolutions_count, resolution_time).
    expect(ReportingEventsRollup::count())->toBe(6);

    $row = ReportingEventsRollup::where('dimension_type', ReportingEventsRollup::DIMENSION_AGENT)
        ->where('metric', 'resolution_time')
        ->sole();

    expect($row->dimension_id)->toBe($this->agent->id)
        ->and($row->count)->toBe(1)
        ->and($row->sum_value)->toBe(600.0)
        ->and($row->sum_value_business_hours)->toBe(300.0);
});

it('adds up repeated events into the same rollup row', function () {
    RollupService::perform(d2RollupEvent(ReportingEvent::NAME_CONVERSATION_RESOLVED, 600));
    RollupService::perform(d2RollupEvent(ReportingEvent::NAME_CONVERSATION_RESOLVED, 400));

    $row = ReportingEventsRollup::where('dimension_type', ReportingEventsRollup::DIMENSION_ACCOUNT)
        ->where('metric', 'resolution_time')
        ->sole();

    expect($row->count)->toBe(2)->and($row->sum_value)->toBe(1000.0);
});

it('stores nothing when the account has no reporting timezone', function () {
    $this->account->update(['settings' => []]);
    $this->account->refresh();

    RollupService::perform(d2RollupEvent(ReportingEvent::NAME_CONVERSATION_RESOLVED, 600));

    expect(ReportingEventsRollup::count())->toBe(0);
});

it('keeps count-only metrics free of duration payload', function () {
    RollupService::perform(d2RollupEvent(ReportingEvent::NAME_CONVERSATION_BOT_HANDOFF, 90));

    $row = ReportingEventsRollup::where('dimension_type', ReportingEventsRollup::DIMENSION_ACCOUNT)->sole();

    expect($row->metric)->toBe('bot_handoffs_count')
        ->and($row->count)->toBe(1)
        ->and($row->sum_value)->toBe(0.0);
});

it('rebuilds a full day of rollups from the raw events', function () {
    Carbon::setTestNow('2026-09-02 03:00:00');
    d2RollupEvent(ReportingEvent::NAME_CONVERSATION_RESOLVED, 600, '2026-09-01 05:00:00');
    d2RollupEvent(ReportingEvent::NAME_CONVERSATION_RESOLVED, 400, '2026-09-01 06:00:00');
    d2RollupEvent(ReportingEvent::NAME_FIRST_RESPONSE, 120, '2026-09-01 07:00:00');
    // Ngoài ngày 01/09 theo giờ Bangkok (17:30 UTC ngày 01 = 00:30 ngày 02).
    d2RollupEvent(ReportingEvent::NAME_CONVERSATION_RESOLVED, 999, '2026-09-01 18:00:00');

    BackfillService::backfillDate($this->account, '2026-09-01');

    $resolutionTime = ReportingEventsRollup::where('dimension_type', ReportingEventsRollup::DIMENSION_ACCOUNT)
        ->where('metric', 'resolution_time')
        ->sole();

    expect($resolutionTime->count)->toBe(2)
        ->and($resolutionTime->sum_value)->toBe(1000.0)
        ->and(ReportingEventsRollup::where('metric', 'first_response')->where('dimension_type', 'inbox')->sole()->count)->toBe(1);

    Carbon::setTestNow();
});

it('replaces existing rollups for the day it rebuilds', function () {
    d2RollupEvent(ReportingEvent::NAME_CONVERSATION_RESOLVED, 600, '2026-09-01 05:00:00');
    ReportingEventsRollup::create([
        'account_id' => $this->account->id,
        'date' => '2026-09-01',
        'dimension_type' => ReportingEventsRollup::DIMENSION_ACCOUNT,
        'dimension_id' => $this->account->id,
        'metric' => 'resolution_time',
        'count' => 99,
        'sum_value' => 9999,
        'sum_value_business_hours' => 0,
    ]);

    BackfillService::backfillDate($this->account, '2026-09-01');

    expect(ReportingEventsRollup::where('metric', 'resolution_time')->where('dimension_type', 'account')->sole()->count)->toBe(1);
});

it('counts bot handoffs once per conversation when rebuilding', function () {
    $other = Conversation::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $this->inbox->id]);
    d2RollupEvent(ReportingEvent::NAME_CONVERSATION_BOT_HANDOFF, 10, '2026-09-01 05:00:00');
    d2RollupEvent(ReportingEvent::NAME_CONVERSATION_BOT_HANDOFF, 20, '2026-09-01 06:00:00');
    ReportingEvent::factory()->forConversation($other, [
        'name' => ReportingEvent::NAME_CONVERSATION_BOT_HANDOFF,
        'value' => 30,
        'value_in_business_hours' => 0,
    ])->create()->forceFill(['created_at' => '2026-09-01 07:00:00'])->saveQuietly();

    BackfillService::backfillDate($this->account, '2026-09-01');

    expect(ReportingEventsRollup::where('metric', 'bot_handoffs_count')->where('dimension_type', 'account')->sole()->count)->toBe(2);
});
