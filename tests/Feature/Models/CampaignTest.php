<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Campaign;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

// Port từ spec/models/campaign_spec.rb (bỏ nhánh one_off/trigger! — kênh
// SMS/Twilio/WhatsApp thuộc E4, và FilteredCountStore thuộc E1).

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->websiteInbox = Inbox::factory()->webWidget()->create(['account_id' => $this->account->id]);
});

// Chạy đúng bộ luật của model như controller vẫn làm, để test bám vào một nguồn.
function validateCampaign(Account $account, array $payload, ?Inbox $inbox = null, ?Campaign $campaign = null): array
{
    $validator = Validator::make($payload, Campaign::validationRules($account, $inbox, $campaign));

    return $validator->fails() ? $validator->errors()->all() : [];
}

it('generates a per-account display_id on create', function () {
    $first = Campaign::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $this->websiteInbox->id]);
    $second = Campaign::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $this->websiteInbox->id]);

    expect($first->refresh()->display_id)->toBe(1)
        ->and($second->refresh()->display_id)->toBe(2);
});

it('rejects an inbox whose channel does not support campaigns', function () {
    $apiInbox = Inbox::factory()->create(['account_id' => $this->account->id]);

    expect(validateCampaign($this->account, [
        'title' => 'test', 'message' => 'test message', 'inbox_id' => $apiInbox->id,
    ]))->toContain('Unsupported Inbox type');
});

it('rejects an inbox from a different account', function () {
    $otherInbox = Inbox::factory()->webWidget()->create(['account_id' => Account::factory()->create()->id]);

    expect(validateCampaign($this->account, [
        'title' => 'test', 'message' => 'test message', 'inbox_id' => $otherInbox->id,
    ]))->not->toBe([]);
});

it('allows an inbox from the same account', function () {
    expect(validateCampaign($this->account, [
        'title' => 'test', 'message' => 'test message', 'inbox_id' => $this->websiteInbox->id,
    ]))->toBe([]);
});

it('allows a sender from the same account', function () {
    $user = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $user->id]);

    expect(validateCampaign($this->account, [
        'title' => 'test', 'message' => 'test message', 'inbox_id' => $this->websiteInbox->id, 'sender_id' => $user->id,
    ]))->toBe([]);
});

it('rejects a sender from a different account', function () {
    $otherAccount = Account::factory()->create();
    $otherUser = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $otherAccount->id, 'user_id' => $otherUser->id]);

    expect(validateCampaign($this->account, [
        'title' => 'test', 'message' => 'test message', 'inbox_id' => $this->websiteInbox->id, 'sender_id' => $otherUser->id,
    ]))->not->toBe([]);
});

it('rejects a trigger url without an http scheme on a website inbox', function () {
    expect(validateCampaign($this->account, [
        'title' => 'test', 'message' => 'test message', 'inbox_id' => $this->websiteInbox->id,
        'trigger_rules' => ['url' => 'javascript'],
    ], $this->websiteInbox))->toContain('invalid');
});

it('accepts an http trigger url on a website inbox', function () {
    expect(validateCampaign($this->account, [
        'title' => 'test', 'message' => 'test message', 'inbox_id' => $this->websiteInbox->id,
        'trigger_rules' => ['url' => 'https://test.com', 'time_on_page' => 10],
    ], $this->websiteInbox))->toBe([]);
});

it('forces a website campaign to be ongoing', function () {
    $campaign = Campaign::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->websiteInbox->id,
        'campaign_type' => Campaign::TYPE_ONE_OFF,
    ]);

    expect($campaign->refresh()->typeName())->toBe('ongoing')
        ->and($campaign->scheduled_at)->toBeNull();
});

it('prevents further updates once the campaign is completed', function () {
    $campaign = Campaign::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->websiteInbox->id,
        'campaign_status' => Campaign::STATUS_COMPLETED,
    ]);

    expect(fn () => $campaign->update(['title' => 'new name']))
        ->toThrow(ValidationException::class, 'The campaign is already completed');
});

it('stamps completed_at when the campaign is marked completed', function () {
    $campaign = Campaign::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $this->websiteInbox->id]);

    $campaign->update(['campaign_status' => Campaign::STATUS_COMPLETED]);

    expect($campaign->refresh()->completed_at)->not->toBeNull();
});

it('can be deleted even when completed', function () {
    $campaign = Campaign::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->websiteInbox->id,
        'campaign_status' => Campaign::STATUS_COMPLETED,
    ]);

    $campaign->delete();

    expect(Campaign::query()->whereKey($campaign->id)->exists())->toBeFalse();
});

it('detaches conversations instead of deleting them when the campaign goes away', function () {
    $campaign = Campaign::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $this->websiteInbox->id]);
    $conversation = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->websiteInbox->id,
        'campaign_id' => $campaign->id,
    ]);

    $campaign->delete();

    expect($conversation->refresh()->campaign_id)->toBeNull();
});
