<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Label;
use App\Models\User;

function filterApiUser(Account $account, int $role = AccountUser::ROLE_ADMINISTRATOR): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create([
        'account_id' => $account->id,
        'user_id' => $user->id,
        'role' => $role,
    ]);

    return $user;
}

function filterApiConversation(Account $account, Inbox $inbox, array $attributes = []): Conversation
{
    $contact = Contact::factory()->create(['account_id' => $account->id]);
    $contactInbox = ContactInbox::factory()->create([
        'contact_id' => $contact->id,
        'inbox_id' => $inbox->id,
    ]);

    return Conversation::factory()->create([
        'account_id' => $account->id,
        'inbox_id' => $inbox->id,
        'contact_id' => $contact->id,
        'contact_inbox_id' => $contactInbox->id,
        ...$attributes,
    ]);
}

function filterPayload(string $attribute, string $operator, array $values, ?string $queryOperator = null): array
{
    return [
        'attribute_key' => $attribute,
        'filter_operator' => $operator,
        'values' => $values,
        ...($queryOperator ? ['query_operator' => $queryOperator] : []),
    ];
}

describe('POST /api/v1/accounts/{id}/conversations/filter', function () {
    it('filters snoozed conversations and returns filtered counts', function () {
        $account = Account::factory()->create();
        $inbox = Inbox::factory()->create(['account_id' => $account->id]);
        $admin = filterApiUser($account);
        filterApiConversation($account, $inbox, ['status' => Conversation::STATUS_OPEN]);
        $snoozed = filterApiConversation($account, $inbox, ['status' => Conversation::STATUS_SNOOZED]);

        $response = $this->actingAs($admin)->postJson(
            "/api/v1/accounts/{$account->id}/conversations/filter",
            ['payload' => [filterPayload('status', 'equal_to', ['snoozed'])]],
        )->assertOk();

        expect($response->json('data.meta.all_count'))->toBe(1)
            ->and($response->json('data.payload'))->toHaveCount(1)
            ->and($response->json('data.payload.0.id'))->toBe($snoozed->display_id)
            ->and($response->json('data.payload.0.status'))->toBe('snoozed');
    });

    it('returns an empty payload without a query error when nothing matches', function () {
        $account = Account::factory()->create();
        $inbox = Inbox::factory()->create(['account_id' => $account->id]);
        $admin = filterApiUser($account);
        filterApiConversation($account, $inbox, ['status' => Conversation::STATUS_OPEN]);

        $response = $this->actingAs($admin)->postJson(
            "/api/v1/accounts/{$account->id}/conversations/filter",
            ['payload' => [filterPayload('status', 'equal_to', ['snoozed'])]],
        )->assertOk();

        expect($response->json('data.meta.all_count'))->toBe(0)
            ->and($response->json('data.payload'))->toBe([]);
    });

    it('combines conditions with the connector on the preceding condition', function () {
        $account = Account::factory()->create();
        $inbox = Inbox::factory()->create(['account_id' => $account->id]);
        $admin = filterApiUser($account);
        $snoozed = filterApiConversation($account, $inbox, ['status' => Conversation::STATUS_SNOOZED]);
        $urgent = filterApiConversation($account, $inbox, [
            'status' => Conversation::STATUS_OPEN,
            'priority' => Conversation::PRIORITY_URGENT,
        ]);
        filterApiConversation($account, $inbox, [
            'status' => Conversation::STATUS_OPEN,
            'priority' => Conversation::PRIORITY_LOW,
        ]);

        $response = $this->actingAs($admin)->postJson(
            "/api/v1/accounts/{$account->id}/conversations/filter",
            ['payload' => [
                filterPayload('status', 'equal_to', ['snoozed'], 'or'),
                filterPayload('priority', 'equal_to', ['urgent']),
            ]],
        )->assertOk();

        expect(collect($response->json('data.payload'))->pluck('id')->sort()->values()->all())
            ->toBe(collect([$snoozed->display_id, $urgent->display_id])->sort()->values()->all());
    });

    it('filters by free-form label title', function () {
        $account = Account::factory()->create();
        $inbox = Inbox::factory()->create(['account_id' => $account->id]);
        $admin = filterApiUser($account);
        $label = Label::factory()->create(['account_id' => $account->id, 'title' => 'Khách VIP Miền Bắc']);
        $matching = filterApiConversation($account, $inbox);
        $matching->updateLabels([$label->title]);
        filterApiConversation($account, $inbox);

        $response = $this->actingAs($admin)->postJson(
            "/api/v1/accounts/{$account->id}/conversations/filter",
            ['payload' => [filterPayload('labels', 'equal_to', [$label->title])]],
        )->assertOk();

        expect($response->json('data.payload'))->toHaveCount(1)
            ->and($response->json('data.payload.0.id'))->toBe($matching->display_id);
    });

    it('keeps inbox permission scope for agents', function () {
        $account = Account::factory()->create();
        $visibleInbox = Inbox::factory()->create(['account_id' => $account->id]);
        $hiddenInbox = Inbox::factory()->create(['account_id' => $account->id]);
        $agent = filterApiUser($account, AccountUser::ROLE_AGENT);
        $visibleInbox->addMembers([$agent->id]);
        $visible = filterApiConversation($account, $visibleInbox, ['status' => Conversation::STATUS_SNOOZED]);
        filterApiConversation($account, $hiddenInbox, ['status' => Conversation::STATUS_SNOOZED]);

        $response = $this->actingAs($agent)->postJson(
            "/api/v1/accounts/{$account->id}/conversations/filter",
            ['payload' => [filterPayload('status', 'equal_to', ['snoozed'])]],
        )->assertOk();

        expect($response->json('data.meta.all_count'))->toBe(1)
            ->and($response->json('data.payload.0.id'))->toBe($visible->display_id);
    });

    it('rejects unknown filter attributes', function () {
        $account = Account::factory()->create();
        $admin = filterApiUser($account);

        $this->actingAs($admin)->postJson(
            "/api/v1/accounts/{$account->id}/conversations/filter",
            ['payload' => [filterPayload('account_id', 'equal_to', [$account->id])]],
        )->assertUnprocessable();
    });
});
