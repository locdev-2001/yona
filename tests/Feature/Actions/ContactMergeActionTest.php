<?php

use App\Actions\ContactMergeAction;
use App\Events\DomainEvent;
use App\Events\EventType;
use App\Models\Account;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use Illuminate\Support\Facades\Event;

// Port từ spec/actions/contact_merge_action_spec.rb.
// Bỏ phần notes: model Note chưa port.

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id]);

    $this->baseContact = Contact::factory()->create([
        'account_id' => $this->account->id,
        'identifier' => 'base_contact',
        'email' => 'old@old.com',
        'phone_number' => '',
        'custom_attributes' => ['val_test' => 'old', 'val_empty_old' => ''],
    ]);
    $this->mergeeContact = Contact::factory()->create([
        'account_id' => $this->account->id,
        'identifier' => '',
        'email' => 'new@new.com',
        'phone_number' => '+12212345',
        'custom_attributes' => ['val_test' => 'new', 'val_new' => 'new', 'val_empty_new' => ''],
    ]);

    foreach ([$this->baseContact, $this->mergeeContact] as $contact) {
        for ($index = 0; $index < 2; $index++) {
            mergeConversationFor($this->inbox, $contact);
        }
    }

    for ($index = 0; $index < 2; $index++) {
        Message::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'conversation_id' => $this->mergeeContact->conversations()->first()->id,
            'sender_type' => $this->mergeeContact->getMorphClass(),
            'sender_id' => $this->mergeeContact->id,
        ]);
    }
});

function mergeConversationFor(Inbox $inbox, Contact $contact): Conversation
{
    $contactInbox = ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $inbox->id]);

    return Conversation::factory()->create([
        'account_id' => $contact->account_id,
        'inbox_id' => $inbox->id,
        'contact_id' => $contact->id,
        'contact_inbox_id' => $contactInbox->id,
    ]);
}

function performMerge(Account $account, Contact $base, Contact $mergee): Contact
{
    return (new ContactMergeAction($account, $base, $mergee))->perform();
}

it('deletes the mergee contact', function () {
    performMerge($this->account, $this->baseContact, $this->mergeeContact);

    expect(Contact::query()->find($this->mergeeContact->id))->toBeNull();
});

it('copies information from the mergee contact into the base contact', function () {
    performMerge($this->account, $this->baseContact, $this->mergeeContact);
    $this->baseContact->refresh();

    expect($this->baseContact->identifier)->toBe('base_contact')
        ->and($this->baseContact->email)->toBe('old@old.com')
        ->and($this->baseContact->phone_number)->toBe('+12212345')
        // jsonb không giữ thứ tự khóa nên so từng khóa như spec gốc.
        ->and($this->baseContact->custom_attributes['val_test'])->toBe('old')
        ->and($this->baseContact->custom_attributes['val_new'])->toBe('new')
        ->and($this->baseContact->custom_attributes['val_empty_old'])->toBe('')
        ->and($this->baseContact->custom_attributes['val_empty_new'])->toBe('');
});

it('does nothing when both contacts are the same record', function () {
    performMerge($this->account, $this->baseContact, $this->baseContact);

    expect(Contact::query()->find($this->baseContact->id))->not->toBeNull();
});

it('moves conversations, contact inboxes and messages to the base contact', function () {
    performMerge($this->account, $this->baseContact, $this->mergeeContact);

    expect($this->baseContact->conversations()->count())->toBe(4)
        ->and($this->baseContact->contactInboxes()->count())->toBe(4)
        ->and(Message::query()->where('sender_type', 'Contact')->where('sender_id', $this->baseContact->id)->count())->toBe(2);
});

it('broadcasts contact.merged for the base contact', function () {
    Event::fake([DomainEvent::class]);

    performMerge($this->account, $this->baseContact, $this->mergeeContact);

    Event::assertDispatched(
        DomainEvent::class,
        fn (DomainEvent $event) => $event->type === EventType::CONTACT_MERGED
            && $event->data['contact']->id === $this->baseContact->id
    );
});

it('refuses to merge contacts of another account', function () {
    $otherAccount = Account::factory()->create();

    expect(fn () => performMerge($otherAccount, $this->baseContact, $this->mergeeContact))
        ->toThrow(RuntimeException::class, 'contact does not belong to the account');
});
