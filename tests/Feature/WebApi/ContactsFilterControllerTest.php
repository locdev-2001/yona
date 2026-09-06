<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\CustomAttributeDefinition;
use App\Models\Label;
use App\Models\User;
use App\Services\Filters\FilterKeys;

function contactFilterUser(Account $account): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create([
        'account_id' => $account->id,
        'user_id' => $user->id,
        'role' => AccountUser::ROLE_ADMINISTRATOR,
    ]);

    return $user;
}

function contactFilterCondition(string $attribute, string $operator, array $values, ?string $queryOperator = null): array
{
    return [
        'attribute_key' => $attribute,
        'filter_operator' => $operator,
        'values' => $values,
        ...($queryOperator ? ['query_operator' => $queryOperator] : []),
    ];
}

describe('POST /api/v1/accounts/{id}/contacts/filter', function () {
    it('requires authentication', function () {
        $account = Account::factory()->create();

        $this->postJson("/api/v1/accounts/{$account->id}/contacts/filter", ['payload' => []])
            ->assertUnauthorized();
    });

    it('filters on an additional attribute case-insensitively', function () {
        $account = Account::factory()->create();
        $admin = contactFilterUser($account);
        $matching = Contact::factory()->withEmail()->create([
            'account_id' => $account->id,
            'additional_attributes' => ['country_code' => 'US'],
        ]);
        Contact::factory()->withEmail()->create([
            'account_id' => $account->id,
            'additional_attributes' => ['country_code' => 'VN'],
        ]);

        $response = $this->actingAs($admin)->postJson(
            "/api/v1/accounts/{$account->id}/contacts/filter",
            ['payload' => [contactFilterCondition('country_code', 'equal_to', ['us'])]],
        )->assertOk();

        expect($response->json('meta.count'))->toBe(1)
            ->and($response->json('payload.0.email'))->toBe($matching->email);
    });

    it('filters on name with contains and on email with equal_to', function () {
        $account = Account::factory()->create();
        $admin = contactFilterUser($account);
        $matching = Contact::factory()->create([
            'account_id' => $account->id,
            'name' => 'Nguyễn Văn A',
            'email' => 'vana@acme.inc',
        ]);
        Contact::factory()->create(['account_id' => $account->id, 'name' => 'Trần Bê', 'email' => 'be@acme.inc']);

        $byName = $this->actingAs($admin)->postJson(
            "/api/v1/accounts/{$account->id}/contacts/filter",
            ['payload' => [contactFilterCondition('name', 'contains', ['NGUYỄN'])]],
        )->assertOk();

        $byEmail = $this->actingAs($admin)->postJson(
            "/api/v1/accounts/{$account->id}/contacts/filter",
            ['payload' => [contactFilterCondition('email', 'equal_to', ['VANA@acme.inc'])]],
        )->assertOk();

        expect($byName->json('payload.0.id'))->toBe($matching->id)
            ->and($byName->json('meta.count'))->toBe(1)
            ->and($byEmail->json('payload.0.id'))->toBe($matching->id);
    });

    it('normalises the phone number to E.164 when comparing for equality', function () {
        $account = Account::factory()->create();
        $admin = contactFilterUser($account);
        $matching = Contact::factory()->create([
            'account_id' => $account->id,
            'phone_number' => '+84901234567',
        ]);

        $response = $this->actingAs($admin)->postJson(
            "/api/v1/accounts/{$account->id}/contacts/filter",
            ['payload' => [contactFilterCondition('phone_number', 'equal_to', ['84901234567'])]],
        )->assertOk();

        expect($response->json('payload.0.id'))->toBe($matching->id);
    });

    it('filters on labels and joins conditions with or', function () {
        $account = Account::factory()->create();
        $admin = contactFilterUser($account);
        $label = Label::factory()->create(['account_id' => $account->id, 'title' => 'vip']);
        $labelled = Contact::factory()->withEmail()->create(['account_id' => $account->id]);
        $labelled->updateLabels([$label->title]);
        $american = Contact::factory()->withEmail()->create([
            'account_id' => $account->id,
            'additional_attributes' => ['country_code' => 'US'],
        ]);
        Contact::factory()->withEmail()->create(['account_id' => $account->id]);

        $response = $this->actingAs($admin)->postJson(
            "/api/v1/accounts/{$account->id}/contacts/filter",
            ['payload' => [
                contactFilterCondition('labels', 'equal_to', ['vip'], 'or'),
                contactFilterCondition('country_code', 'equal_to', ['US']),
            ]],
        )->assertOk();

        expect(collect($response->json('payload'))->pluck('id')->sort()->values()->all())
            ->toBe(collect([$labelled->id, $american->id])->sort()->values()->all());
    });

    it('filters contacts on a custom attribute', function () {
        $account = Account::factory()->create();
        $admin = contactFilterUser($account);
        CustomAttributeDefinition::factory()->create([
            'account_id' => $account->id,
            'attribute_model' => CustomAttributeDefinition::MODEL_CONTACT,
            'attribute_key' => 'loyalty_tier',
            'attribute_display_type' => 'text',
        ]);
        $matching = Contact::factory()->withEmail()->create([
            'account_id' => $account->id,
            'custom_attributes' => ['loyalty_tier' => 'Gold'],
        ]);
        Contact::factory()->withEmail()->create([
            'account_id' => $account->id,
            'custom_attributes' => ['loyalty_tier' => 'silver'],
        ]);
        Contact::factory()->withEmail()->create(['account_id' => $account->id]);

        $equal = $this->actingAs($admin)->postJson(
            "/api/v1/accounts/{$account->id}/contacts/filter",
            ['payload' => [contactFilterCondition('loyalty_tier', 'equal_to', ['gold'])]],
        )->assertOk();

        $notEqual = $this->actingAs($admin)->postJson(
            "/api/v1/accounts/{$account->id}/contacts/filter",
            ['payload' => [contactFilterCondition('loyalty_tier', 'not_equal_to', ['gold'])]],
        )->assertOk();

        expect($equal->json('meta.count'))->toBe(1)
            ->and($equal->json('payload.0.id'))->toBe($matching->id)
            // not_equal_to phải bắt cả hồ sơ chưa từng được gán thuộc tính này.
            ->and($notEqual->json('meta.count'))->toBe(2);
    });

    it('reports an invalid operator, an unknown key and a missing value', function () {
        $account = Account::factory()->create();
        $admin = contactFilterUser($account);

        $this->actingAs($admin)->postJson(
            "/api/v1/accounts/{$account->id}/contacts/filter",
            ['payload' => [contactFilterCondition('country_code', 'eq', ['US'])]],
        )
            ->assertStatus(422)
            ->assertJsonPath('message', 'Invalid operator. The allowed operators for country_code are [equal_to,not_equal_to].');

        $this->actingAs($admin)->postJson(
            "/api/v1/accounts/{$account->id}/contacts/filter",
            ['payload' => [contactFilterCondition('country_code', 'equal_to', [])]],
        )
            ->assertStatus(422)
            ->assertJsonPath('message', 'Invalid value. The values provided for country_code are invalid');

        $this->actingAs($admin)->postJson(
            "/api/v1/accounts/{$account->id}/contacts/filter",
            ['payload' => [contactFilterCondition('nope', 'equal_to', ['x'])]],
        )
            ->assertStatus(422)
            ->assertJsonFragment(['message' => 'Invalid attribute key - [nope]. The key should be one of ['
                .implode(',', array_keys(FilterKeys::CONTACTS))
                .'] or a custom attribute defined in the account.']);
    });
});
