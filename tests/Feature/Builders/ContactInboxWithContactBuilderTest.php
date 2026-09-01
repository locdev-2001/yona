<?php

use App\Builders\ContactInboxWithContactBuilder;
use App\Models\Account;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Inbox;

// Port từ spec/builders/contact_inbox_with_contact_builder_spec.rb
// (bỏ case Instagram — driver chưa port).

function builderFixtures(): array
{
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);
    $contact = Contact::factory()->create([
        'account_id' => $account->id,
        'email' => 'xyc@example.com',
        'phone_number' => '+23423424123',
        'identifier' => '123',
    ]);

    return [$account, $inbox, $contact];
}

it('does not create contact if one already exists with the source id', function () {
    [, $inbox, $contact] = builderFixtures();
    $existing = ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $inbox->id]);

    $contactInbox = (new ContactInboxWithContactBuilder($inbox, [
        'name' => 'Contact',
        'phone_number' => '+1234567890',
        'email' => 'testemail@example.com',
    ], $existing->source_id))->perform();

    expect($contactInbox->contact->id)->toBe($contact->id);
});

it('creates contact when none exists with the source id', function () {
    [, $inbox, $contact] = builderFixtures();

    $contactInbox = (new ContactInboxWithContactBuilder($inbox, [
        'name' => 'Contact',
        'phone_number' => '+1234567890',
        'email' => 'testemail@example.com',
        'custom_attributes' => ['test' => 'test'],
    ], '123456'))->perform();

    expect($contactInbox->contact->id)->not->toBe($contact->id)
        ->and($contactInbox->contact->name)->toBe('Contact')
        ->and($contactInbox->contact->custom_attributes)->toBe(['test' => 'test'])
        ->and($contactInbox->inbox_id)->toBe($inbox->id);
});

it('truncates long contact names before creating the contact', function () {
    [, $inbox] = builderFixtures();

    $contactInbox = (new ContactInboxWithContactBuilder($inbox, [
        'name' => str_repeat('a', 300),
        'email' => 'testemail@example.com',
    ], '123456'))->perform();

    expect($contactInbox->contact->name)->toBe(str_repeat('a', 255));
});

it('generates a fallback name when none is given', function () {
    [, $inbox] = builderFixtures();

    $contactInbox = (new ContactInboxWithContactBuilder($inbox, [
        'email' => 'anonymous@example.com',
    ], '123456'))->perform();

    expect($contactInbox->contact->name)->not->toBe('');
});

it('does not create contact if one already exists with the identifier', function () {
    [, $inbox, $contact] = builderFixtures();

    $contactInbox = (new ContactInboxWithContactBuilder($inbox, [
        'name' => 'Contact',
        'identifier' => $contact->identifier,
        'phone_number' => $contact->phone_number,
        'email' => 'testemail@example.com',
    ], '123456'))->perform();

    expect($contactInbox->contact->id)->toBe($contact->id);
});

it('does not create contact if one already exists with the email', function () {
    [, $inbox, $contact] = builderFixtures();

    $contactInbox = (new ContactInboxWithContactBuilder($inbox, [
        'name' => 'Contact',
        'phone_number' => '+1234567890',
        'email' => $contact->email,
    ], '123456'))->perform();

    expect($contactInbox->contact->id)->toBe($contact->id);
});

it('does not create contact when an uppercase email of an existing contact is passed', function () {
    [, $inbox, $contact] = builderFixtures();

    $contactInbox = (new ContactInboxWithContactBuilder($inbox, [
        'name' => 'Contact',
        'phone_number' => '+1234567890',
        'email' => mb_strtoupper($contact->email),
    ], '123456'))->perform();

    expect($contactInbox->contact->id)->toBe($contact->id);
});

it('does not create contact if one already exists with the phone number', function () {
    [, $inbox, $contact] = builderFixtures();

    $contactInbox = (new ContactInboxWithContactBuilder($inbox, [
        'name' => 'Contact',
        'phone_number' => $contact->phone_number,
        'email' => 'testemail@example.com',
    ], '123456'))->perform();

    expect($contactInbox->contact->id)->toBe($contact->id);
});
