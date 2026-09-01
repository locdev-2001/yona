<?php

use App\Builders\ContactInboxBuilder;
use App\Models\Account;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Inbox;
use Illuminate\Database\UniqueConstraintViolationException;

// Port từ spec/builders/contact_inbox_builder_spec.rb — block "api inbox"
// + race condition (các kênh Twilio/Whatsapp/Email/Sms port cùng driver).

it('does not create contact inbox when one already exists with the source id provided', function () {
    $account = Account::factory()->create();
    $contact = Contact::factory()->create(['account_id' => $account->id]);
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);
    $existing = ContactInbox::factory()->create([
        'contact_id' => $contact->id, 'inbox_id' => $inbox->id, 'source_id' => 'test',
    ]);

    $contactInbox = (new ContactInboxBuilder($contact, $inbox, 'test'))->perform();

    expect($contactInbox->id)->toBe($existing->id);
});

it('creates a new contact inbox when a different source id is provided', function () {
    $account = Account::factory()->create();
    $contact = Contact::factory()->create(['account_id' => $account->id]);
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);
    $existing = ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $inbox->id]);

    $contactInbox = (new ContactInboxBuilder($contact, $inbox, 'test'))->perform();

    expect($contactInbox->id)->not->toBe($existing->id)
        ->and($contactInbox->source_id)->toBe('test');
});

it('creates a contact inbox with a random uuid when source id not provided', function () {
    $account = Account::factory()->create();
    $contact = Contact::factory()->create(['account_id' => $account->id]);
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);

    $contactInbox = (new ContactInboxBuilder($contact, $inbox))->perform();

    expect($contactInbox->source_id)->toBeUuid();
});

it('raises on duplicate source id belonging to another contact for api channel', function () {
    $account = Account::factory()->create();
    $contact = Contact::factory()->create(['account_id' => $account->id]);
    $otherContact = Contact::factory()->create(['account_id' => $account->id]);
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);
    ContactInbox::factory()->create([
        'contact_id' => $otherContact->id, 'inbox_id' => $inbox->id, 'source_id' => 'source_123',
    ]);

    expect(fn () => (new ContactInboxBuilder($contact, $inbox, 'source_123'))->perform())
        ->toThrow(UniqueConstraintViolationException::class);
});
