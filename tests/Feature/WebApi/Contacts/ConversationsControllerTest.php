<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\User;

// Port từ spec/controllers/api/v1/accounts/contacts/conversations_controller_spec.rb.

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->contact = Contact::factory()->create(['account_id' => $this->account->id]);
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);
    $this->inbox->addMembers([$this->agent->id]);
});

describe('GET /api/v1/accounts/{id}/contacts/{contactId}/conversations', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->getJson("/api/v1/accounts/{$this->account->id}/contacts/{$this->contact->id}/conversations")
            ->assertUnauthorized();
    });

    it('returns the conversations of the contact, newest activity first', function () {
        $older = Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'contact_id' => $this->contact->id,
            'last_activity_at' => now()->subDay(),
        ]);
        $newer = Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'contact_id' => $this->contact->id,
            'last_activity_at' => now(),
        ]);

        $response = $this->actingAs($this->agent)
            ->getJson("/api/v1/accounts/{$this->account->id}/contacts/{$this->contact->id}/conversations")
            ->assertOk();

        expect(array_column($response->json('payload'), 'id'))
            ->toBe([$newer->display_id, $older->display_id]);
    });

    it('hides conversations in inboxes the agent cannot access', function () {
        $otherInbox = Inbox::factory()->create(['account_id' => $this->account->id]);
        Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $otherInbox->id,
            'contact_id' => $this->contact->id,
        ]);

        $this->actingAs($this->agent)
            ->getJson("/api/v1/accounts/{$this->account->id}/contacts/{$this->contact->id}/conversations")
            ->assertOk()
            ->assertJsonPath('payload', []);
    });
});
