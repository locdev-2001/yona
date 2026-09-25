<?php

use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Support\WidgetTokenService;
use Tests\Support\WidgetSession;

// Port từ spec/controllers/api/v1/widget/contacts_controller_spec.rb.

function widgetIdentifierHash(WidgetSession $session, string $identifier): string
{
    return hash_hmac('sha256', $identifier, $session->channel->hmac_token);
}

describe('GET /api/v1/widget/contact', function () {
    it('returns identity flags only', function () {
        $session = WidgetSession::make(contactAttributes: [
            'email' => 'test@test.com',
            'phone_number' => '+745623239',
            'identifier' => 'abc',
        ]);

        $this->getJson($session->url('contact'), $session->headers())
            ->assertOk()
            ->assertExactJson([
                'id' => $session->contact->id,
                'has_email' => true,
                'has_name' => true,
                'has_phone_number' => true,
                'identifier' => 'abc',
                'pubsub_token' => $session->contactInbox->pubsub_token,
            ]);
    });
});

describe('PATCH /api/v1/widget/contact', function () {
    it('returns not found with an invalid website token', function () {
        WidgetSession::make();

        $this->patchJson('/api/v1/widget/contact', ['website_token' => ''])->assertNotFound();
    });

    it('does not update an invalid phone number', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => 'test@test.com', 'phone_number' => '+745623239']);

        $this->patchJson($session->url('contact'), ['phone_number' => '45623239'], $session->headers())
            ->assertOk()
            ->assertJson(['has_phone_number' => true]);

        expect($session->contact->fresh()->phone_number)->toBe('+745623239');
    });

    it('updates a valid phone number', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => 'test@test.com', 'phone_number' => '+745623239']);

        $this->patchJson($session->url('contact'), ['phone_number' => '+245623239'], $session->headers())->assertOk();

        expect($session->contact->fresh()->phone_number)->toBe('+245623239');
    });

    it('keeps the current email for invalid, empty or null values', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => 'test@test.com', 'phone_number' => '+745623239']);

        foreach (['test@', '', null] as $email) {
            $this->patchJson($session->url('contact'), ['email' => $email], $session->headers())
                ->assertOk()
                ->assertJson(['has_email' => true]);

            expect($session->contact->fresh()->email)->toBe('test@test.com');
        }
    });

    it('updates a valid email', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => 'test@test.com', 'phone_number' => '+745623239']);

        $this->patchJson($session->url('contact'), ['email' => 'test-1@test.com'], $session->headers())->assertOk();

        expect($session->contact->fresh()->email)->toBe('test-1@test.com');
    });
});

describe('PATCH /api/v1/widget/contact with HMAC enforcement', function () {
    it('rejects an identifier without a valid hash', function (mixed $identifierHash) {
        $session = WidgetSession::make(['hmac_mandatory' => true]);
        $victim = Contact::factory()->create([
            'account_id' => $session->account->id,
            'identifier' => 'victim-identifier',
            'name' => 'Victim',
        ]);

        $this->patchJson($session->url('contact'), [
            'identifier' => 'victim-identifier',
            'identifier_hash' => $identifierHash,
            'name' => 'Attacker',
        ], $session->headers())->assertUnauthorized();

        expect($victim->fresh()->name)->toBe('Victim');
    })->with([
        'omitted' => [null],
        'blank' => [''],
        'wrong' => ['DEFINITELY_INVALID_AAAAA_NOT_A_REAL_HMAC'],
    ]);

    it('accepts a valid identifier hash', function () {
        $session = WidgetSession::make(['hmac_mandatory' => true]);
        Contact::factory()->create([
            'account_id' => $session->account->id,
            'identifier' => 'victim-identifier',
            'name' => 'Victim',
        ]);

        $this->patchJson($session->url('contact'), [
            'identifier' => 'victim-identifier',
            'identifier_hash' => widgetIdentifierHash($session, 'victim-identifier'),
            'name' => 'Legit',
        ], $session->headers())->assertOk();
    });

    it('allows an anonymous prechat update without an identifier hash', function () {
        $session = WidgetSession::make(['hmac_mandatory' => true]);
        $victim = Contact::factory()->create([
            'account_id' => $session->account->id,
            'identifier' => 'victim-identifier',
            'name' => 'Victim',
        ]);

        $this->patchJson($session->url('contact'), [
            'email' => 'prechat@test.com',
            'name' => 'Prechat User',
        ], $session->headers())->assertOk();

        expect($victim->fresh()->email)->toBeNull();
        expect(Contact::fromEmail('prechat@test.com'))->not->toBeNull();
    });
});

describe('PATCH /api/v1/widget/contact/set_user', function () {
    it('returns a new contact and a fresh widget token for a different identifier', function () {
        $session = WidgetSession::make(['hmac_mandatory' => true], ['identifier' => 'random']);

        $response = $this->patchJson($session->url('contact/set_user'), [
            'identifier' => 'test',
            'identifier_hash' => widgetIdentifierHash($session, 'test'),
        ], $session->headers())->assertOk();

        expect($response->json('id'))->not->toBe($session->contact->id);
        expect($response->json('widget_auth_token'))->not->toBeNull();

        $newContact = Contact::query()->findOrFail($response->json('id'));
        expect($newContact->contactInboxes()->first()->hmac_verified)->toBeTrue();
        expect(WidgetTokenService::decode($response->json('widget_auth_token')))
            ->toMatchArray(['inbox_id' => $session->inbox->id]);
    });

    it('marks the current session verified when the hash is valid', function () {
        $session = WidgetSession::make(['hmac_mandatory' => true]);

        $this->patchJson($session->url('contact/set_user'), [
            'identifier' => 'test',
            'identifier_hash' => widgetIdentifierHash($session, 'test'),
        ], $session->headers())->assertOk();

        expect($session->contactInbox->fresh()->hmac_verified)->toBeTrue();
        expect($session->contact->fresh()->identifier)->toBe('test');
    });

    it('rejects a missing or invalid identifier hash', function (mixed $identifierHash) {
        $session = WidgetSession::make(['hmac_mandatory' => true]);

        $this->patchJson($session->url('contact/set_user'), [
            'identifier' => 'test',
            'identifier_hash' => $identifierHash,
        ], $session->headers())->assertUnauthorized();
    })->with([
        'omitted' => [null],
        'blank' => [''],
        'wrong' => ['test'],
    ]);
});

describe('POST /api/v1/widget/contact/destroy_custom_attributes', function () {
    it('returns not found with an invalid website token', function () {
        WidgetSession::make();

        $this->postJson('/api/v1/widget/contact/destroy_custom_attributes', ['website_token' => ''])->assertNotFound();
    });

    it('removes the listed custom attributes', function () {
        $session = WidgetSession::make();
        $session->contact->update(['custom_attributes' => ['test' => 'value', 'keep' => 'me']]);

        $this->postJson(
            $session->url('contact/destroy_custom_attributes'),
            ['custom_attributes' => ['test']],
            $session->headers()
        )->assertOk();

        expect($session->contact->fresh()->custom_attributes)->toBe(['keep' => 'me']);
    });
});

describe('visitor conversations after hmac verification', function () {
    it('sees conversations from every verified session of the same contact', function () {
        $session = WidgetSession::make();
        $session->contactInbox->update(['hmac_verified' => true]);

        $otherSession = ContactInbox::factory()->create([
            'contact_id' => $session->contact->id,
            'inbox_id' => $session->inbox->id,
            'hmac_verified' => true,
        ]);

        $conversation = Conversation::factory()->create([
            'account_id' => $session->account->id,
            'inbox_id' => $session->inbox->id,
            'contact_id' => $session->contact->id,
            'contact_inbox_id' => $otherSession->id,
        ]);

        $this->getJson($session->url('conversations'), $session->headers())
            ->assertOk()
            ->assertJson(['id' => $conversation->display_id]);
    });
});
