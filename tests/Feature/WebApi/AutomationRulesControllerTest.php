<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\AutomationRule;
use App\Models\User;

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->admin = User::factory()->create();
    AccountUser::factory()->administrator()->create([
        'account_id' => $this->account->id,
        'user_id' => $this->admin->id,
    ]);
});

function d1AutomationPayload(array $overrides = []): array
{
    return array_replace_recursive([
        'name' => 'Pricing routing',
        'description' => 'Route messages about pricing',
        'event_name' => 'message_created',
        'conditions' => [[
            'attribute_key' => 'content',
            'filter_operator' => 'contains',
            'values' => ['gia'],
            'query_operator' => null,
        ]],
        'actions' => [[
            'action_name' => 'resolve_conversation',
            'action_params' => [],
        ]],
    ], $overrides);
}

it('requires an administrator and scopes every rule to its account', function () {
    $agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $agent->id]);

    $this->actingAs($agent)
        ->getJson("/api/v1/accounts/{$this->account->id}/automation_rules")
        ->assertUnauthorized();

    $foreignAccount = Account::factory()->create();
    $foreignRule = AutomationRule::factory()->create(['account_id' => $foreignAccount->id]);

    $this->actingAs($this->admin)
        ->getJson("/api/v1/accounts/{$this->account->id}/automation_rules/{$foreignRule->id}")
        ->assertNotFound();
});

it('creates, lists, updates, clones and deletes an automation rule', function () {
    $url = "/api/v1/accounts/{$this->account->id}/automation_rules";

    $created = $this->actingAs($this->admin)
        ->postJson($url, d1AutomationPayload())
        ->assertOk()
        ->assertJsonPath('name', 'Pricing routing')
        ->assertJsonPath('conditions.0.attribute_key', 'content')
        ->json();

    expect($created['id'])->toBeInt();

    $this->actingAs($this->admin)->getJson($url)
        ->assertOk()
        ->assertJsonPath('payload.0.id', $created['id']);

    $this->actingAs($this->admin)
        ->patchJson("{$url}/{$created['id']}", ['name' => 'Pricing routing v2'])
        ->assertOk()
        ->assertJsonPath('payload.name', 'Pricing routing v2');

    $this->actingAs($this->admin)
        ->postJson("{$url}/{$created['id']}/clone")
        ->assertOk()
        ->assertJsonPath('payload.name', 'Pricing routing v2');

    expect($this->account->automationRules()->count())->toBe(2);

    $this->actingAs($this->admin)
        ->deleteJson("{$url}/{$created['id']}")
        ->assertOk();

    expect($this->account->automationRules()->count())->toBe(1);
});

it('rejects unknown conditions, unsupported actions and invalid query operators', function () {
    $url = "/api/v1/accounts/{$this->account->id}/automation_rules";

    foreach ([
        ['conditions' => [['attribute_key' => 'unknown', 'filter_operator' => 'equal_to', 'values' => ['x']]]],
        ['actions' => [['action_name' => 'send_webhook_event', 'action_params' => ['https://example.com']]]],
        ['conditions' => [
            ['attribute_key' => 'content', 'filter_operator' => 'contains', 'values' => ['x'], 'query_operator' => 'invalid'],
            ['attribute_key' => 'email', 'filter_operator' => 'contains', 'values' => ['x']],
        ]],
    ] as $override) {
        $this->actingAs($this->admin)
            ->postJson($url, d1AutomationPayload($override))
            ->assertUnprocessable();
    }

    expect($this->account->automationRules()->count())->toBe(0);
});

it('rejects delayed rules while the account feature is disabled', function () {
    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/automation_rules", d1AutomationPayload([
            'execution_delay' => 60,
        ]))
        ->assertUnprocessable();

    expect($this->account->automationRules()->count())->toBe(0);
});
