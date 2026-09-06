<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\CustomAttributeDefinition;
use App\Models\User;

function attributeApiUser(Account $account, int $role = AccountUser::ROLE_ADMINISTRATOR): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create([
        'account_id' => $account->id,
        'user_id' => $user->id,
        'role' => $role,
    ]);

    return $user;
}

function definitionPayload(array $overrides = []): array
{
    return ['custom_attribute_definition' => [
        'attribute_display_name' => 'Developer ID',
        'attribute_key' => 'developer_id',
        'attribute_model' => 'contact_attribute',
        'attribute_display_type' => 'text',
        ...$overrides,
    ]];
}

describe('custom_attribute_definitions API', function () {
    it('requires authentication', function () {
        $account = Account::factory()->create();

        $this->getJson("/api/v1/accounts/{$account->id}/custom_attribute_definitions")
            ->assertUnauthorized();
    });

    it('lists every definition of the account and filters by attribute model', function () {
        $account = Account::factory()->create();
        $admin = attributeApiUser($account);
        $conversationAttribute = CustomAttributeDefinition::factory()->create(['account_id' => $account->id]);
        CustomAttributeDefinition::factory()->create([
            'account_id' => $account->id,
            'attribute_model' => CustomAttributeDefinition::MODEL_CONTACT,
        ]);

        $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/custom_attribute_definitions")
            ->assertOk()
            ->assertJsonCount(2);

        $filtered = $this->actingAs($admin)->getJson(
            "/api/v1/accounts/{$account->id}/custom_attribute_definitions?attribute_model=conversation_attribute"
        )->assertOk();

        expect($filtered->json())->toHaveCount(1)
            ->and($filtered->json('0.attribute_key'))->toBe($conversationAttribute->attribute_key)
            ->and($filtered->json('0.attribute_model'))->toBe('conversation_attribute')
            ->and($filtered->json('0.attribute_display_type'))->toBe('number');
    });

    it('shows a definition', function () {
        $account = Account::factory()->create();
        $admin = attributeApiUser($account);
        $definition = CustomAttributeDefinition::factory()->create(['account_id' => $account->id]);

        $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/custom_attribute_definitions/{$definition->id}")
            ->assertOk()
            ->assertJsonPath('attribute_key', $definition->attribute_key);
    });

    it('creates a definition for an administrator', function () {
        $account = Account::factory()->create();
        $admin = attributeApiUser($account);

        $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/custom_attribute_definitions", definitionPayload())
            ->assertOk()
            ->assertJsonPath('attribute_key', 'developer_id')
            ->assertJsonPath('attribute_model', 'contact_attribute');

        expect(CustomAttributeDefinition::query()->count())->toBe(1);
    });

    it('generates an accent-free key from the display name when the client sends none', function () {
        $account = Account::factory()->create();
        $admin = attributeApiUser($account);

        $first = $this->actingAs($admin)->postJson(
            "/api/v1/accounts/{$account->id}/custom_attribute_definitions",
            definitionPayload(['attribute_display_name' => 'Ngày đặt hàng', 'attribute_key' => null]),
        )->assertOk();

        $second = $this->actingAs($admin)->postJson(
            "/api/v1/accounts/{$account->id}/custom_attribute_definitions",
            definitionPayload(['attribute_display_name' => 'Ngày đặt hàng', 'attribute_key' => '']),
        )->assertOk();

        expect($first->json('attribute_key'))->toBe('ngay_dat_hang')
            ->and($second->json('attribute_key'))->toBe('ngay_dat_hang_2');
    });

    it('never generates a key that collides with a standard attribute', function () {
        $account = Account::factory()->create();
        $admin = attributeApiUser($account);

        $response = $this->actingAs($admin)->postJson(
            "/api/v1/accounts/{$account->id}/custom_attribute_definitions",
            definitionPayload(['attribute_display_name' => 'Email', 'attribute_key' => null]),
        )->assertOk();

        expect($response->json('attribute_key'))->toBe('email_2');
    });

    it('rejects a client supplied key that conflicts with a standard attribute', function () {
        $account = Account::factory()->create();
        $admin = attributeApiUser($account);

        $this->actingAs($admin)->postJson(
            "/api/v1/accounts/{$account->id}/custom_attribute_definitions",
            definitionPayload(['attribute_model' => 'conversation_attribute', 'attribute_key' => 'status']),
        )
            ->assertStatus(422)
            ->assertJsonPath('message', 'The provided key is not allowed as it might conflict with default attributes.');
    });

    it('rejects a malformed key and a duplicate key', function () {
        $account = Account::factory()->create();
        $admin = attributeApiUser($account);

        $this->actingAs($admin)->postJson(
            "/api/v1/accounts/{$account->id}/custom_attribute_definitions",
            definitionPayload(['attribute_key' => 'key; DROP TABLE users--']),
        )
            ->assertStatus(422)
            ->assertJsonPath('message', 'must only contain letters, numbers, underscores, hyphens, and dots');

        $this->actingAs($admin)->postJson(
            "/api/v1/accounts/{$account->id}/custom_attribute_definitions",
            definitionPayload(),
        )->assertOk();

        $this->actingAs($admin)->postJson(
            "/api/v1/accounts/{$account->id}/custom_attribute_definitions",
            definitionPayload(),
        )
            ->assertStatus(422)
            ->assertJsonPath('message', 'Attribute key has already been taken');
    });

    it('requires a display name', function () {
        $account = Account::factory()->create();
        $admin = attributeApiUser($account);

        $this->actingAs($admin)->postJson(
            "/api/v1/accounts/{$account->id}/custom_attribute_definitions",
            definitionPayload(['attribute_display_name' => '  ']),
        )
            ->assertStatus(422)
            ->assertJsonPath('message', "Attribute display name can't be blank");
    });

    it('trims the display name and the key', function () {
        $account = Account::factory()->create();
        $admin = attributeApiUser($account);

        $this->actingAs($admin)->postJson(
            "/api/v1/accounts/{$account->id}/custom_attribute_definitions",
            definitionPayload(['attribute_display_name' => '  Order Date  ', 'attribute_key' => '  order_date  ']),
        )
            ->assertOk()
            ->assertJsonPath('attribute_display_name', 'Order Date')
            ->assertJsonPath('attribute_key', 'order_date');
    });

    it('updates a definition and keeps the key when none is sent', function () {
        $account = Account::factory()->create();
        $admin = attributeApiUser($account);
        $definition = CustomAttributeDefinition::factory()->create([
            'account_id' => $account->id,
            'attribute_key' => 'order_date',
        ]);

        $this->actingAs($admin)->patchJson(
            "/api/v1/accounts/{$account->id}/custom_attribute_definitions/{$definition->id}",
            ['custom_attribute_definition' => ['attribute_display_name' => 'Ngày giao hàng']],
        )
            ->assertOk()
            ->assertJsonPath('attribute_display_name', 'Ngày giao hàng')
            ->assertJsonPath('attribute_key', 'order_date')
            ->assertJsonPath('attribute_model', 'conversation_attribute');
    });

    it('deletes a definition', function () {
        $account = Account::factory()->create();
        $admin = attributeApiUser($account);
        $definition = CustomAttributeDefinition::factory()->create(['account_id' => $account->id]);

        $this->actingAs($admin)
            ->deleteJson("/api/v1/accounts/{$account->id}/custom_attribute_definitions/{$definition->id}")
            ->assertNoContent();

        expect(CustomAttributeDefinition::query()->count())->toBe(0);
    });

    it('lets an agent read but never write', function () {
        $account = Account::factory()->create();
        $agent = attributeApiUser($account, AccountUser::ROLE_AGENT);
        $definition = CustomAttributeDefinition::factory()->create(['account_id' => $account->id]);

        $this->actingAs($agent)
            ->getJson("/api/v1/accounts/{$account->id}/custom_attribute_definitions")
            ->assertOk();

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/custom_attribute_definitions", definitionPayload())
            ->assertUnauthorized()
            ->assertJsonPath('error', 'You are not authorized to do this action');

        $this->actingAs($agent)->patchJson(
            "/api/v1/accounts/{$account->id}/custom_attribute_definitions/{$definition->id}",
            definitionPayload(),
        )->assertUnauthorized();

        $this->actingAs($agent)
            ->deleteJson("/api/v1/accounts/{$account->id}/custom_attribute_definitions/{$definition->id}")
            ->assertUnauthorized();

        expect(CustomAttributeDefinition::query()->count())->toBe(1);
    });

    it('never reaches a definition of another account', function () {
        $account = Account::factory()->create();
        $admin = attributeApiUser($account);
        $other = CustomAttributeDefinition::factory()->create();

        $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/custom_attribute_definitions/{$other->id}")
            ->assertNotFound();
    });
});
