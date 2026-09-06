<?php

use App\Models\AgentBot;
use App\Models\AgentBotInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\ReportingEvent;
use App\Models\User;
use App\Models\WorkingHour;
use Carbon\Carbon;

// Port từ spec/listeners/reporting_event_listener_spec.rb + spec/helpers/reporting_event_helper_spec.rb.

beforeEach(function () {
    $this->inbox = Inbox::factory()->create();
    $this->account = $this->inbox->account;
    $this->agent = User::factory()->create();
});

function d2Conversation(array $attributes = []): Conversation
{
    return Conversation::factory()->create(array_replace([
        'account_id' => test()->inbox->account_id,
        'inbox_id' => test()->inbox->id,
    ], $attributes));
}

it('records conversation_resolved with the time to resolve', function () {
    Carbon::setTestNow('2026-09-01 10:00:00');
    $conversation = d2Conversation(['assignee_id' => $this->agent->id]);

    Carbon::setTestNow('2026-09-01 10:05:00');
    $conversation->update(['status' => Conversation::STATUS_RESOLVED]);

    $event = ReportingEvent::where('name', ReportingEvent::NAME_CONVERSATION_RESOLVED)->sole();
    expect($event->value)->toBe(300.0)
        ->and($event->account_id)->toBe($this->account->id)
        ->and($event->inbox_id)->toBe($this->inbox->id)
        ->and($event->user_id)->toBe($this->agent->id)
        ->and($event->conversation_id)->toBe($conversation->id)
        ->and($event->value_in_business_hours)->toBe(0.0);

    Carbon::setTestNow();
});

it('adds a conversation_bot_resolved event when the inbox bot handled everything', function () {
    $bot = AgentBot::factory()->create(['account_id' => $this->account->id]);
    AgentBotInbox::factory()->create([
        'inbox_id' => $this->inbox->id,
        'agent_bot_id' => $bot->id,
        'status' => AgentBotInbox::STATUS_ACTIVE,
    ]);

    $conversation = d2Conversation();
    $conversation->update(['status' => Conversation::STATUS_RESOLVED]);

    expect(ReportingEvent::where('name', ReportingEvent::NAME_CONVERSATION_BOT_RESOLVED)->count())->toBe(1);
});

it('skips conversation_bot_resolved when an agent replied in the conversation', function () {
    $bot = AgentBot::factory()->create(['account_id' => $this->account->id]);
    AgentBotInbox::factory()->create([
        'inbox_id' => $this->inbox->id,
        'agent_bot_id' => $bot->id,
        'status' => AgentBotInbox::STATUS_ACTIVE,
    ]);

    $conversation = d2Conversation();
    Message::factory()->outgoing()->create([
        'account_id' => $this->account->id,
        'conversation_id' => $conversation->id,
        'inbox_id' => $this->inbox->id,
        'sender_type' => 'User',
        'sender_id' => $this->agent->id,
    ]);

    $conversation->refresh()->update(['status' => Conversation::STATUS_RESOLVED]);

    expect(ReportingEvent::where('name', ReportingEvent::NAME_CONVERSATION_BOT_RESOLVED)->count())->toBe(0);
});

it('records first_response measured from the conversation creation time', function () {
    Carbon::setTestNow('2026-09-01 10:00:00');
    $conversation = d2Conversation();

    Carbon::setTestNow('2026-09-01 10:02:00');
    Message::factory()->outgoing()->create([
        'account_id' => $this->account->id,
        'conversation_id' => $conversation->id,
        'inbox_id' => $this->inbox->id,
        'sender_type' => 'User',
        'sender_id' => $this->agent->id,
    ]);

    $event = ReportingEvent::where('name', ReportingEvent::NAME_FIRST_RESPONSE)->sole();
    expect($event->value)->toBe(120.0)->and($event->user_id)->toBe($this->agent->id);

    Carbon::setTestNow();
});

it('records reply_time from the moment the customer started waiting', function () {
    Carbon::setTestNow('2026-09-01 10:00:00');
    $conversation = d2Conversation(['first_reply_created_at' => now()]);

    Carbon::setTestNow('2026-09-01 10:04:00');
    Message::factory()->outgoing()->create([
        'account_id' => $this->account->id,
        'conversation_id' => $conversation->id,
        'inbox_id' => $this->inbox->id,
        'sender_type' => 'User',
        'sender_id' => $this->agent->id,
    ]);

    // Conversation#before_create đặt waiting_since = created_at nên mốc chờ là 10:00.
    $event = ReportingEvent::where('name', ReportingEvent::NAME_REPLY_TIME)->sole();
    expect($event->value)->toBe(240.0);

    Carbon::setTestNow();
});

it('records conversation_opened with value 0 the first time and the gap on reopen', function () {
    Carbon::setTestNow('2026-09-01 10:00:00');
    $conversation = d2Conversation(['status' => Conversation::STATUS_PENDING]);

    Carbon::setTestNow('2026-09-01 10:01:00');
    $conversation->update(['status' => Conversation::STATUS_OPEN]);

    Carbon::setTestNow('2026-09-01 10:02:00');
    $conversation->update(['status' => Conversation::STATUS_RESOLVED]);

    Carbon::setTestNow('2026-09-01 10:07:00');
    $conversation->update(['status' => Conversation::STATUS_OPEN]);

    $opened = ReportingEvent::where('name', ReportingEvent::NAME_CONVERSATION_OPENED)->orderBy('id')->get();
    expect($opened)->toHaveCount(2)
        ->and($opened[0]->value)->toBe(0.0)
        ->and($opened[1]->value)->toBe(300.0);

    Carbon::setTestNow();
});

it('measures first_response from the latest reopen instead of the creation time', function () {
    Carbon::setTestNow('2026-09-01 10:00:00');
    $conversation = d2Conversation(['status' => Conversation::STATUS_PENDING]);

    Carbon::setTestNow('2026-09-01 10:10:00');
    $conversation->update(['status' => Conversation::STATUS_OPEN]);

    Carbon::setTestNow('2026-09-01 10:11:00');
    Message::factory()->outgoing()->create([
        'account_id' => $this->account->id,
        'conversation_id' => $conversation->id,
        'inbox_id' => $this->inbox->id,
        'sender_type' => 'User',
        'sender_id' => $this->agent->id,
    ]);

    expect(ReportingEvent::where('name', ReportingEvent::NAME_FIRST_RESPONSE)->sole()->value)->toBe(60.0);

    Carbon::setTestNow();
});

it('counts only working minutes in value_in_business_hours', function () {
    // 2026-09-01 là thứ ba; inbox mở 09:00-17:00 giờ UTC.
    $this->inbox->update(['working_hours_enabled' => true, 'timezone' => 'UTC']);
    WorkingHour::where('inbox_id', $this->inbox->id)->delete();

    foreach (range(0, 6) as $dayOfWeek) {
        WorkingHour::factory()->create([
            'inbox_id' => $this->inbox->id,
            'day_of_week' => $dayOfWeek,
            'closed_all_day' => false,
            'open_hour' => 9,
            'open_minutes' => 0,
            'close_hour' => 17,
            'close_minutes' => 0,
        ]);
    }

    Carbon::setTestNow('2026-09-01 16:30:00');
    $conversation = d2Conversation();

    Carbon::setTestNow('2026-09-02 09:30:00');
    $conversation->update(['status' => Conversation::STATUS_RESOLVED]);

    $event = ReportingEvent::where('name', ReportingEvent::NAME_CONVERSATION_RESOLVED)->sole();
    // 16:30→17:00 (30') + 09:00→09:30 (30') = 3600 giây trong giờ làm việc.
    expect($event->value_in_business_hours)->toBe(3600.0)
        ->and($event->value)->toBe(61200.0);

    Carbon::setTestNow();
});
