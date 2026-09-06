<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\CustomAttributeDefinition;
use App\Models\Inbox;
use App\Models\User;
use Illuminate\Testing\TestResponse;

function customAttributeFilterAdmin(Account $account): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create([
        'account_id' => $account->id,
        'user_id' => $user->id,
        'role' => AccountUser::ROLE_ADMINISTRATOR,
    ]);

    return $user;
}

function conversationWithCustomAttributes(Account $account, Inbox $inbox, array $customAttributes): Conversation
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
        'custom_attributes' => $customAttributes,
    ]);
}

function customAttributeDefinition(Account $account, string $key, string $displayType): CustomAttributeDefinition
{
    return CustomAttributeDefinition::factory()->create([
        'account_id' => $account->id,
        'attribute_model' => CustomAttributeDefinition::MODEL_CONVERSATION,
        'attribute_key' => $key,
        'attribute_display_type' => $displayType,
    ]);
}

function filterConversationsBy(User $admin, Account $account, array $condition): TestResponse
{
    return test()->actingAs($admin)->postJson(
        "/api/v1/accounts/{$account->id}/conversations/filter",
        ['payload' => [$condition]],
    );
}

describe('conversation filters on custom attributes', function () {
    beforeEach(function () {
        $this->account = Account::factory()->create();
        $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
        $this->admin = customAttributeFilterAdmin($this->account);
    });

    it('compares a text attribute case-insensitively and catches unset rows on not_equal_to', function () {
        customAttributeDefinition($this->account, 'plan', 'text');
        $gold = conversationWithCustomAttributes($this->account, $this->inbox, ['plan' => 'Gold']);
        conversationWithCustomAttributes($this->account, $this->inbox, ['plan' => 'silver']);
        conversationWithCustomAttributes($this->account, $this->inbox, []);

        $equal = filterConversationsBy($this->admin, $this->account, [
            'attribute_key' => 'plan',
            'filter_operator' => 'equal_to',
            'values' => ['GOLD'],
            'custom_attribute_type' => 'conversation_attribute',
        ])->assertOk();

        $notEqual = filterConversationsBy($this->admin, $this->account, [
            'attribute_key' => 'plan',
            'filter_operator' => 'not_equal_to',
            'values' => ['gold'],
        ])->assertOk();

        expect($equal->json('data.meta.all_count'))->toBe(1)
            ->and($equal->json('data.payload.0.id'))->toBe($gold->display_id)
            ->and($notEqual->json('data.meta.all_count'))->toBe(2);
    });

    it('matches a substring with contains', function () {
        customAttributeDefinition($this->account, 'source_page', 'link');
        $matching = conversationWithCustomAttributes($this->account, $this->inbox, [
            'source_page' => 'https://yona.vn/bang-gia',
        ]);
        conversationWithCustomAttributes($this->account, $this->inbox, ['source_page' => 'https://yona.vn/blog']);

        $response = filterConversationsBy($this->admin, $this->account, [
            'attribute_key' => 'source_page',
            'filter_operator' => 'contains',
            'values' => ['BANG-GIA'],
        ])->assertOk();

        expect($response->json('data.meta.all_count'))->toBe(1)
            ->and($response->json('data.payload.0.id'))->toBe($matching->display_id);
    });

    it('compares a number attribute numerically, not as text', function () {
        customAttributeDefinition($this->account, 'order_total', 'number');
        $big = conversationWithCustomAttributes($this->account, $this->inbox, ['order_total' => '1000']);
        conversationWithCustomAttributes($this->account, $this->inbox, ['order_total' => '90']);

        $response = filterConversationsBy($this->admin, $this->account, [
            'attribute_key' => 'order_total',
            'filter_operator' => 'is_greater_than',
            'values' => ['100'],
        ])->assertOk();

        expect($response->json('data.meta.all_count'))->toBe(1)
            ->and($response->json('data.payload.0.id'))->toBe($big->display_id);
    });

    it('turns days_before on a date attribute into a cutoff date', function () {
        customAttributeDefinition($this->account, 'signed_at', 'date');
        $old = conversationWithCustomAttributes($this->account, $this->inbox, [
            'signed_at' => now()->subDays(30)->toDateString(),
        ]);
        conversationWithCustomAttributes($this->account, $this->inbox, [
            'signed_at' => now()->subDay()->toDateString(),
        ]);

        $response = filterConversationsBy($this->admin, $this->account, [
            'attribute_key' => 'signed_at',
            'filter_operator' => 'days_before',
            'values' => ['7'],
        ])->assertOk();

        expect($response->json('data.meta.all_count'))->toBe(1)
            ->and($response->json('data.payload.0.id'))->toBe($old->display_id);
    });

    it('supports presence checks on a checkbox attribute', function () {
        customAttributeDefinition($this->account, 'contract_signed', 'checkbox');
        $signed = conversationWithCustomAttributes($this->account, $this->inbox, ['contract_signed' => true]);
        conversationWithCustomAttributes($this->account, $this->inbox, ['contract_signed' => false]);
        conversationWithCustomAttributes($this->account, $this->inbox, []);

        $present = filterConversationsBy($this->admin, $this->account, [
            'attribute_key' => 'contract_signed',
            'filter_operator' => 'is_present',
            'values' => [],
        ])->assertOk();

        $equal = filterConversationsBy($this->admin, $this->account, [
            'attribute_key' => 'contract_signed',
            'filter_operator' => 'equal_to',
            'values' => [true],
        ])->assertOk();

        expect($present->json('data.meta.all_count'))->toBe(2)
            ->and($equal->json('data.meta.all_count'))->toBe(1)
            ->and($equal->json('data.payload.0.id'))->toBe($signed->display_id);
    });

    it('never crosses the account or the attribute model boundary', function () {
        customAttributeDefinition($this->account, 'plan', 'text');
        CustomAttributeDefinition::factory()->create([
            'account_id' => Account::factory()->create()->id,
            'attribute_key' => 'other_account_key',
            'attribute_display_type' => 'text',
        ]);
        CustomAttributeDefinition::factory()->create([
            'account_id' => $this->account->id,
            'attribute_model' => CustomAttributeDefinition::MODEL_CONTACT,
            'attribute_key' => 'contact_only_key',
            'attribute_display_type' => 'text',
        ]);

        filterConversationsBy($this->admin, $this->account, [
            'attribute_key' => 'other_account_key',
            'filter_operator' => 'equal_to',
            'values' => ['x'],
        ])->assertStatus(422);

        filterConversationsBy($this->admin, $this->account, [
            'attribute_key' => 'contact_only_key',
            'filter_operator' => 'equal_to',
            'values' => ['x'],
        ])->assertStatus(422);
    });

    it('rejects an operator that the display type does not support', function () {
        customAttributeDefinition($this->account, 'order_total', 'number');

        filterConversationsBy($this->admin, $this->account, [
            'attribute_key' => 'order_total',
            'filter_operator' => 'contains',
            'values' => ['10'],
        ])
            ->assertStatus(422)
            ->assertJsonPath(
                'message',
                'Invalid operator. The allowed operators for order_total are '
                .'[equal_to,not_equal_to,is_greater_than,is_less_than,is_present,is_not_present].',
            );
    });

    it('rejects a non numeric value for a number attribute', function () {
        customAttributeDefinition($this->account, 'order_total', 'number');

        filterConversationsBy($this->admin, $this->account, [
            'attribute_key' => 'order_total',
            'filter_operator' => 'is_greater_than',
            'values' => ['1); DROP TABLE conversations; --'],
        ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Invalid value. The values provided for order_total are invalid');
    });

    it('rejects a query operator on the last condition and an unknown connector', function () {
        $this->actingAs($this->admin)->postJson(
            "/api/v1/accounts/{$this->account->id}/conversations/filter",
            ['payload' => [[
                'attribute_key' => 'status',
                'filter_operator' => 'equal_to',
                'values' => ['open'],
                'query_operator' => 'and',
            ]]],
        )
            ->assertStatus(422)
            ->assertJsonPath('message', 'Query operator must be either "AND" or "OR".');

        $this->actingAs($this->admin)->postJson(
            "/api/v1/accounts/{$this->account->id}/conversations/filter",
            ['payload' => [
                ['attribute_key' => 'status', 'filter_operator' => 'equal_to', 'values' => ['open'], 'query_operator' => 'xor'],
                ['attribute_key' => 'priority', 'filter_operator' => 'equal_to', 'values' => ['urgent']],
            ]],
        )
            ->assertStatus(422)
            ->assertJsonPath('message', 'Query operator must be either "AND" or "OR".');
    });

    it('rejects days_before outside the supported range', function () {
        filterConversationsBy($this->admin, $this->account, [
            'attribute_key' => 'created_at',
            'filter_operator' => 'days_before',
            'values' => ['0'],
        ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Invalid value. The values provided for created_at are invalid');

        filterConversationsBy($this->admin, $this->account, [
            'attribute_key' => 'created_at',
            'filter_operator' => 'days_before',
            'values' => ['999'],
        ])->assertStatus(422);
    });
});
