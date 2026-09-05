<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\User;

// Port từ Api::V1::Accounts::Actions::ContactMergesController.

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);

    $this->baseContact = Contact::factory()->create(['account_id' => $this->account->id, 'name' => 'Base', 'email' => 'base@acme.test']);
    $this->mergeeContact = Contact::factory()->create([
        'account_id' => $this->account->id,
        'name' => 'Mergee',
        'phone_number' => '+12212345',
    ]);
});

function contactMergeUrl(Account $account): string
{
    return "/api/v1/accounts/{$account->id}/actions/contact_merge";
}

it('returns unauthorized for guests', function () {
    $this->postJson(contactMergeUrl($this->account))->assertUnauthorized();
});

it('merges the contacts and returns the base contact payload', function () {
    $response = $this->actingAs($this->agent)
        ->postJson(contactMergeUrl($this->account), [
            'base_contact_id' => $this->baseContact->id,
            'mergee_contact_id' => $this->mergeeContact->id,
        ])
        ->assertOk();

    expect($response->json('id'))->toBe($this->baseContact->id)
        ->and($response->json('name'))->toBe('Base')
        ->and($response->json('phone_number'))->toBe('+12212345')
        ->and(Contact::query()->find($this->mergeeContact->id))->toBeNull();
});

it('returns not found when a contact belongs to another account', function () {
    $foreignContact = Contact::factory()->create(['account_id' => Account::factory()->create()->id]);

    $this->actingAs($this->agent)
        ->postJson(contactMergeUrl($this->account), [
            'base_contact_id' => $this->baseContact->id,
            'mergee_contact_id' => $foreignContact->id,
        ])
        ->assertNotFound()
        ->assertJson(['error' => 'Resource could not be found']);
});
