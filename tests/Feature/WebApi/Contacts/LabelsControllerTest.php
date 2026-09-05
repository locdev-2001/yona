<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\Label;
use App\Models\User;

// Port từ spec/controllers/api/v1/accounts/contacts/labels_controller_spec.rb.

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->contact = Contact::factory()->create(['account_id' => $this->account->id]);

    foreach (['label1', 'label2', 'label3', 'label4'] as $title) {
        Label::factory()->create(['account_id' => $this->account->id, 'title' => $title]);
    }

    $this->contact->updateLabels('label1, label2');

    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);
});

describe('GET /api/v1/accounts/{id}/contacts/{contactId}/labels', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->getJson("/api/v1/accounts/{$this->account->id}/contacts/{$this->contact->id}/labels")
            ->assertUnauthorized();
    });

    it('returns all the labels of the contact', function () {
        $this->actingAs($this->agent)
            ->getJson("/api/v1/accounts/{$this->account->id}/contacts/{$this->contact->id}/labels")
            ->assertOk()
            ->assertJsonPath('payload', ['label1', 'label2']);
    });

    it('returns not found for a contact of another account', function () {
        $otherContact = Contact::factory()->create();

        $this->actingAs($this->agent)
            ->getJson("/api/v1/accounts/{$this->account->id}/contacts/{$otherContact->id}/labels")
            ->assertNotFound();
    });
});

describe('POST /api/v1/accounts/{id}/contacts/{contactId}/labels', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->postJson(
            "/api/v1/accounts/{$this->account->id}/contacts/{$this->contact->id}/labels",
            ['labels' => ['label3', 'label4']]
        )->assertUnauthorized();
    });

    it('replaces the labels of the contact', function () {
        $this->actingAs($this->agent)
            ->postJson(
                "/api/v1/accounts/{$this->account->id}/contacts/{$this->contact->id}/labels",
                ['labels' => ['label3', 'label4']]
            )
            ->assertOk()
            ->assertJsonPath('payload', ['label3', 'label4']);

        expect($this->contact->labelList())->toBe(['label3', 'label4']);
    });
});
