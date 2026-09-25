<?php

use App\Models\AccountUser;
use App\Models\Campaign;
use App\Models\Conversation;
use App\Models\User;
use Tests\Support\WidgetSession;

// Port từ spec/controllers/api/v1/widget/campaigns_controller_spec.rb.

beforeEach(function () {
    $this->session = WidgetSession::make();
    $this->enabledCampaign = Campaign::factory()->create([
        'account_id' => $this->session->account->id,
        'inbox_id' => $this->session->inbox->id,
        'enabled' => true,
        'trigger_rules' => ['url' => 'https://test.com', 'time_on_page' => 10],
    ])->refresh();
    $this->disabledCampaign = Campaign::factory()->create([
        'account_id' => $this->session->account->id,
        'inbox_id' => $this->session->inbox->id,
        'enabled' => false,
        'trigger_rules' => ['url' => 'https://test.com'],
    ])->refresh();
});

it('returns only the enabled campaigns when the feature is on', function () {
    $this->session->account->forceFill(['feature_flags' => ['campaigns' => true]])->save();

    $response = $this->getJson($this->session->url('campaigns'))->assertOk();

    expect($response->json())->toHaveCount(1)
        ->and($response->json('0.id'))->toBe($this->enabledCampaign->display_id)
        ->and($response->json('0.trigger_rules'))->toBe(['url' => 'https://test.com', 'time_on_page' => 10])
        ->and($response->json('0.trigger_only_during_business_hours'))->toBeFalse()
        ->and($response->json('0.message'))->toBe($this->enabledCampaign->message)
        ->and($response->json('0.sender'))->toBeNull();
});

it('returns an empty array when the feature is off', function () {
    $this->session->account->forceFill(['feature_flags' => ['campaigns' => false]])->save();

    $this->getJson($this->session->url('campaigns'))->assertOk()->assertExactJson([]);
});

it('returns not found with an invalid website token', function () {
    $this->getJson('/api/v1/widget/campaigns?website_token=')->assertNotFound();
});

// Widget hỏi campaign TRƯỚC khi có phiên khách (skip_before_action :set_contact).
it('answers without a widget session token', function () {
    $this->session->account->forceFill(['feature_flags' => ['campaigns' => true]])->save();

    $this->getJson($this->session->url('campaigns'))->assertOk();
});

it('includes the sender push payload when the campaign has one', function () {
    $sender = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->session->account->id, 'user_id' => $sender->id]);
    $this->enabledCampaign->update(['sender_id' => $sender->id]);

    $response = $this->getJson($this->session->url('campaigns'))->assertOk();

    expect($response->json('0.sender.id'))->toBe($sender->id)
        ->and($response->json('0.sender.type'))->toBe('user');
});

it('trả chip trả lời nhanh và chỉ mời đúng nhóm khách (mới / quay lại)', function () {
    $this->session->account->forceFill(['feature_flags' => ['campaigns' => true]])->save();
    $this->enabledCampaign->update(['quick_replies' => ['Còn hàng không?', 'Phí ship?'], 'show_to' => 'new']);
    $returningOnly = Campaign::factory()->create([
        'account_id' => $this->session->account->id,
        'inbox_id' => $this->session->inbox->id,
        'enabled' => true,
        'show_to' => 'returning',
    ])->refresh();

    $fresh = $this->getJson($this->session->url('campaigns'), $this->session->headers())->assertOk();
    expect(collect($fresh->json())->pluck('id')->all())->toBe([$this->enabledCampaign->display_id])
        ->and($fresh->json('0.quick_replies'))->toBe(['Còn hàng không?', 'Phí ship?']);

    Conversation::factory()->create([
        'account_id' => $this->session->account->id,
        'inbox_id' => $this->session->inbox->id,
        'contact_id' => $this->session->contact->id,
        'contact_inbox_id' => $this->session->contactInbox->id,
    ]);

    $returning = $this->getJson($this->session->url('campaigns'), $this->session->headers())->assertOk();
    expect(collect($returning->json())->pluck('id')->all())->toBe([$returningOnly->display_id]);
});
