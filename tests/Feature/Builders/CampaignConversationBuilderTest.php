<?php

use App\Builders\Campaigns\CampaignConversationBuilder;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Campaign;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;

// Port từ spec/builders/campaigns/campaign_conversation_builder_spec.rb.

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

it('creates a conversation with the campaign id and the campaign message', function () {
    $conversation = (new CampaignConversationBuilder(
        contactInboxId: $this->contactInbox->id,
        campaignDisplayId: $this->campaign->display_id,
    ))->perform();

    expect($conversation)->not->toBeNull()
        ->and($conversation->campaign_id)->toBe($this->campaign->id);

    $message = $conversation->messages()->first();

    expect($message->content)->toBe($this->campaign->message)
        ->and($message->additional_attributes['campaign_id'])->toBe($this->campaign->id)
        ->and($message->message_type)->toBe(Message::TYPE_OUTGOING);
});

it('does not create a conversation when one already exists for the session', function () {
    Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'contact_id' => $this->contact->id,
        'contact_inbox_id' => $this->contactInbox->id,
    ]);

    $conversation = (new CampaignConversationBuilder(
        contactInboxId: $this->contactInbox->id,
        campaignDisplayId: $this->campaign->display_id,
    ))->perform();

    expect($conversation)->toBeNull()
        ->and($this->contactInbox->conversations()->count())->toBe(1);
});

it('returns null for an unknown campaign display id', function () {
    $conversation = (new CampaignConversationBuilder(
        contactInboxId: $this->contactInbox->id,
        campaignDisplayId: 9999,
    ))->perform();

    expect($conversation)->toBeNull()
        ->and($this->contactInbox->conversations()->count())->toBe(0);
});

it('sends the campaign message from the campaign sender', function () {
    $sender = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $sender->id]);
    $this->campaign->update(['sender_id' => $sender->id]);

    $conversation = (new CampaignConversationBuilder(
        contactInboxId: $this->contactInbox->id,
        campaignDisplayId: $this->campaign->display_id,
    ))->perform();

    expect($conversation->messages()->first()->sender_id)->toBe($sender->id);
});

it('keeps the extra event info on the conversation', function () {
    $conversation = (new CampaignConversationBuilder(
        contactInboxId: $this->contactInbox->id,
        campaignDisplayId: $this->campaign->display_id,
        conversationAdditionalAttributes: ['referer' => 'https://test.com/pricing'],
        customAttributes: ['order_id' => 321],
    ))->perform();

    expect($conversation->additional_attributes['referer'])->toBe('https://test.com/pricing')
        ->and($conversation->custom_attributes['order_id'])->toBe(321);
});
