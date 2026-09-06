<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\Label;
use App\Models\User;

// contacts#index: resolved_contacts.tagged_with(params[:labels], any: true).

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->user = User::factory()->create();
    AccountUser::factory()->administrator()->create([
        'account_id' => $this->account->id,
        'user_id' => $this->user->id,
    ]);

    Label::query()->create(['account_id' => $this->account->id, 'title' => 'vip']);
    Label::query()->create(['account_id' => $this->account->id, 'title' => 'lead']);
});

it('keeps only contacts carrying one of the requested labels', function () {
    $vip = Contact::query()->create(['account_id' => $this->account->id, 'email' => 'vip@example.com']);
    $vip->addLabels(['vip']);

    $lead = Contact::query()->create(['account_id' => $this->account->id, 'email' => 'lead@example.com']);
    $lead->addLabels(['lead']);

    Contact::query()->create(['account_id' => $this->account->id, 'email' => 'plain@example.com']);

    $response = $this->actingAs($this->user)
        ->getJson("/api/v1/accounts/{$this->account->id}/contacts?labels[]=vip&labels[]=lead")
        ->assertOk();

    expect($response->json('meta.count'))->toBe(2)
        ->and(array_column($response->json('payload'), 'email'))
        ->toEqualCanonicalizing(['vip@example.com', 'lead@example.com']);
});

it('returns every resolved contact when no label is given', function () {
    Contact::query()->create(['account_id' => $this->account->id, 'email' => 'plain@example.com']);

    expect($this->actingAs($this->user)
        ->getJson("/api/v1/accounts/{$this->account->id}/contacts")
        ->assertOk()
        ->json('meta.count'))->toBe(1);
});
