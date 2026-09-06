<?php

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Models\Account;
use App\Models\Campaign;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Inbox;
use Tests\Support\WidgetSession;

// Port từ spec/listeners/campaign_listener_spec.rb. Bản gốc mock builder; ở đây
// quan sát kết quả thật (hội thoại có sinh ra hay không) để bắt cả seam nối.

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->inbox = Inbox::factory()->webWidget()->create(['account_id' => $this->account->id]);
    $this->contact = Contact::factory()->create(['account_id' => $this->account->id, 'identifier' => '123']);
    $this->contactInbox = ContactInbox::factory()->create([
        'contact_id' => $this->contact->id,
        'inbox_id' => $this->inbox->id,
    ]);
    $this->campaign = Campaign::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'trigger_rules' => ['url' => 'https://test.com'],
    ])->refresh();
});

it('builds the campaign conversation when the event carries a campaign id', function () {
    DomainEvent::dispatch(EventType::CAMPAIGN_TRIGGERED, [
        'contact_inbox' => $this->contactInbox,
        'event_info' => [
            'campaign_id' => $this->campaign->display_id,
            'custom_attributes' => ['order_id' => 321],
            'referer' => 'https://test.com/pricing',
        ],
    ]);

    $conversation = $this->contactInbox->conversations()->first();

    expect($conversation)->not->toBeNull()
        ->and($conversation->campaign_id)->toBe($this->campaign->id)
        ->and($conversation->custom_attributes)->toBe(['order_id' => 321])
        ->and($conversation->additional_attributes)->toBe(['referer' => 'https://test.com/pricing'])
        ->and($conversation->messages()->first()->content)->toBe($this->campaign->message);
});

it('does nothing when the event has no campaign id', function () {
    DomainEvent::dispatch(EventType::CAMPAIGN_TRIGGERED, [
        'contact_inbox' => $this->contactInbox,
        'event_info' => [],
    ]);

    expect($this->contactInbox->conversations()->count())->toBe(0);
});

// Widget bắn campaign.triggered qua /api/v1/widget/events — nối đủ đường từ HTTP.
it('runs end to end from the widget events endpoint', function () {
    $session = WidgetSession::make();
    $campaign = Campaign::factory()->create([
        'account_id' => $session->account->id,
        'inbox_id' => $session->inbox->id,
        'trigger_rules' => ['url' => 'https://test.com'],
    ])->refresh();

    $this->withHeaders($session->headers())
        ->postJson($session->url('events'), [
            'name' => 'campaign.triggered',
            'event_info' => ['campaign_id' => $campaign->display_id],
        ])
        ->assertNoContent();

    $conversation = $session->contactInbox->conversations()->first();

    expect($conversation)->not->toBeNull()
        ->and($conversation->campaign_id)->toBe($campaign->id)
        ->and($conversation->messages()->first()->content)->toBe($campaign->message);
});
