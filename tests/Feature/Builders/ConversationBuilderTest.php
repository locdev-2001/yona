<?php

use App\Builders\ConversationBuilder;
use App\Models\Account;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Team;
use App\Models\User;

// Port từ spec/builders/conversation_builder_spec.rb.
// Bỏ ở B3: cặp case kênh SMS (driver Channel::Sms chưa port — hành vi builder
// không phụ thuộc kênh nên cặp case kênh API phủ cùng nhánh code).

function conversationBuilderFixtures(): array
{
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);
    $contact = Contact::factory()->create(['account_id' => $account->id]);
    $contactInbox = ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $inbox->id]);

    return [$account, $inbox, $contactInbox];
}

it('creates api conversation', function () {
    [, , $contactInbox] = conversationBuilderFixtures();

    $conversation = (new ConversationBuilder([], $contactInbox))->perform();

    expect($conversation->contact_inbox_id)->toBe($contactInbox->id)
        ->and($conversation->account_id)->toBe($contactInbox->inbox->account_id)
        ->and($conversation->inbox_id)->toBe($contactInbox->inbox_id)
        ->and($conversation->contact_id)->toBe($contactInbox->contact_id);
});

describe('when lock_to_single_conversation is true', function () {
    it('creates conversation when existing conversation is not present', function () {
        [, $inbox, $contactInbox] = conversationBuilderFixtures();
        $inbox->update(['lock_to_single_conversation' => true]);

        $conversation = (new ConversationBuilder([], $contactInbox))->perform();

        expect($conversation->contact_inbox_id)->toBe($contactInbox->id);
    });

    it('returns last from existing conversations', function () {
        [, $inbox, $contactInbox] = conversationBuilderFixtures();
        $inbox->update(['lock_to_single_conversation' => true]);
        Conversation::factory()->create([
            'account_id' => $inbox->account_id,
            'inbox_id' => $inbox->id,
            'contact_id' => $contactInbox->contact_id,
            'contact_inbox_id' => $contactInbox->id,
        ]);
        $existingConversation = Conversation::factory()->create([
            'account_id' => $inbox->account_id,
            'inbox_id' => $inbox->id,
            'contact_id' => $contactInbox->contact_id,
            'contact_inbox_id' => $contactInbox->id,
        ]);

        $conversation = (new ConversationBuilder([], $contactInbox))->perform();

        expect($conversation->id)->toBe($existingConversation->id);
    });
});

describe('when lock_to_single_conversation is false', function () {
    it('creates a new conversation even when one exists', function () {
        [, $inbox, $contactInbox] = conversationBuilderFixtures();
        $existingConversation = Conversation::factory()->create([
            'account_id' => $inbox->account_id,
            'inbox_id' => $inbox->id,
            'contact_id' => $contactInbox->contact_id,
            'contact_inbox_id' => $contactInbox->id,
        ]);

        $conversation = (new ConversationBuilder([], $contactInbox))->perform();

        expect($conversation->id)->not->toBe($existingConversation->id)
            ->and(Conversation::query()->count())->toBe(2);
    });
});

it('maps the conversation params', function () {
    [$account, , $contactInbox] = conversationBuilderFixtures();
    $assignee = User::factory()->create();
    $team = Team::factory()->create(['account_id' => $account->id]);
    $snoozedUntil = now()->addDay();

    $conversation = (new ConversationBuilder([
        'additional_attributes' => ['test' => 'test'],
        'custom_attributes' => ['tier' => 'gold'],
        'status' => 'snoozed',
        'snoozed_until' => $snoozedUntil,
        'assignee_id' => $assignee->id,
        'team_id' => $team->id,
    ], $contactInbox))->perform();

    expect($conversation->additional_attributes)->toBe(['test' => 'test'])
        ->and($conversation->custom_attributes)->toBe(['tier' => 'gold'])
        ->and($conversation->statusName())->toBe('snoozed')
        ->and($conversation->snoozed_until->getTimestamp())->toBe($snoozedUntil->getTimestamp())
        ->and($conversation->assignee_id)->toBe($assignee->id)
        ->and($conversation->team_id)->toBe($team->id);
});
