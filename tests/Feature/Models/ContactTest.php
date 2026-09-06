<?php

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Http\Resources\ContactResource;
use App\Models\Account;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Inbox;
use Illuminate\Support\Facades\Event;

// Port từ spec/models/contact_spec.rb (phần validation format email/phone
// nằm ở ContactsControllerTest — Laravel validate ở controller).

describe('prepare contact attributes', function () {
    it('sets email to lowercase and promotes to lead', function () {
        $contact = Contact::factory()->create(['email' => 'Test@test.com']);

        expect($contact->email)->toBe('test@test.com')
            ->and($contact->contactTypeName())->toBe('lead');
    });

    it('sets email to null when empty string and stays visitor', function () {
        $contact = Contact::factory()->create(['email' => '']);

        expect($contact->email)->toBeNull()
            ->and($contact->contactTypeName())->toBe('visitor');
    });

    it('sets custom_attributes to empty array when null', function () {
        $contact = Contact::factory()->create(['custom_attributes' => null]);

        expect($contact->custom_attributes)->toBe([]);
    });

    it('sets additional_attributes to empty array when null', function () {
        $contact = Contact::factory()->create(['additional_attributes' => null]);

        expect($contact->additional_attributes)->toBe([]);
    });
});

describe('sync contact attributes', function () {
    it('updates location and country code from additional attributes', function () {
        $contact = Contact::factory()->create(['additional_attributes' => ['city' => 'New York', 'country' => 'US']]);

        expect($contact->location)->toBe('New York')
            ->and($contact->country_code)->toBe('US');
    });

    it('has contact type visitor by default', function () {
        expect(Contact::factory()->create()->contactTypeName())->toBe('visitor');
    });

    it('has contact type lead when contacted through a social channel', function () {
        $contact = Contact::factory()->create(['additional_attributes' => ['social_facebook_user_id' => '123']]);

        expect($contact->contactTypeName())->toBe('lead');
    });

    it('does not demote an existing customer', function () {
        $contact = Contact::factory()->create(['email' => 'customer@test.com']);
        $contact->update(['contact_type' => Contact::CONTACT_TYPES[Contact::TYPE_CUSTOMER]]);
        $contact->update(['name' => 'Renamed']);

        expect($contact->refresh()->contactTypeName())->toBe('customer');
    });
});

describe('resolved contacts scope', function () {
    it('returns contacts with email, phone number or identifier when crm_v2 disabled', function () {
        $account = Account::factory()->create();
        $withEmail = Contact::factory()->create(['account_id' => $account->id, 'email' => 'test@example.com']);
        $withPhone = Contact::factory()->create(['account_id' => $account->id, 'phone_number' => '+1234567890']);
        $withIdentifier = Contact::factory()->create(['account_id' => $account->id, 'identifier' => 'user123']);
        $withoutDetails = Contact::factory()->create(['account_id' => $account->id]);

        $resolvedIds = $account->contacts()->resolvedContacts(useCrmV2: false)->pluck('id');

        expect($resolvedIds)->toContain($withEmail->id, $withPhone->id, $withIdentifier->id)
            ->not->toContain($withoutDetails->id);
    });

    it('returns only lead contacts when crm_v2 enabled', function () {
        $account = Account::factory()->create();
        $lead = Contact::factory()->create(['account_id' => $account->id, 'email' => 'lead@example.com']);
        $visitor = Contact::factory()->create(['account_id' => $account->id]);
        $customer = Contact::factory()->create(['account_id' => $account->id, 'email' => 'customer@test.com']);
        $customer->update(['contact_type' => Contact::CONTACT_TYPES[Contact::TYPE_CUSTOMER]]);

        $resolvedIds = $account->contacts()->resolvedContacts(useCrmV2: true)->pluck('id');

        expect($resolvedIds)->toContain($lead->id)
            ->not->toContain($visitor->id, $customer->id);
    });
});

it('deletes contact inboxes when contact is deleted', function () {
    $account = Account::factory()->create();
    $contact = Contact::factory()->create(['account_id' => $account->id]);
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);
    $contactInbox = ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $inbox->id]);

    $contact->delete();

    expect(ContactInbox::query()->whereKey($contactInbox->id)->exists())->toBeFalse();
});

it('generates a pubsub token for new contact inboxes', function () {
    $contactInbox = ContactInbox::factory()->create();

    expect($contactInbox->pubsub_token)->toHaveLength(24);
});

describe('dispatch events', function () {
    beforeEach(function () {
        Event::fake([DomainEvent::class]);
    });

    it('dispatches contact.created, contact.updated and contact.deleted', function () {
        $contact = Contact::factory()->create(['name' => 'Alice']);
        Event::assertDispatched(DomainEvent::class, fn (DomainEvent $event) => $event->type === EventType::CONTACT_CREATED
            && $event->data['contact']->is($contact));

        $contact->update(['name' => 'Bob']);
        Event::assertDispatched(DomainEvent::class, fn (DomainEvent $event) => $event->type === EventType::CONTACT_UPDATED
            && $event->data['contact']->is($contact)
            && $event->data['changed_attributes']['name'] === ['Alice', 'Bob']);

        $contact->delete();
        // `==`: custom_attributes/additional_attributes là stdClass, mỗi lần dựng một instance khác.
        Event::assertDispatched(DomainEvent::class, fn (DomainEvent $event) => $event->type === EventType::CONTACT_DELETED
            && $event->data['contact_data'] == [...ContactResource::pushEventData($contact), 'account_id' => $contact->account_id]);
    });
});
