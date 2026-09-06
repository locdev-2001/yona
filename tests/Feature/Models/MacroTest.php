<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Macro;
use App\Models\User;

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->admin = User::factory()->create();
    $this->adminMembership = AccountUser::factory()->administrator()->create([
        'account_id' => $this->account->id,
        'user_id' => $this->admin->id,
    ]);
});

function d3Macro(array $attributes = []): Macro
{
    return Macro::factory()->create(array_replace([
        'account_id' => test()->account->id,
        'created_by_id' => test()->admin->id,
        'updated_by_id' => test()->admin->id,
    ], $attributes));
}

function d3AgentMembership(User $user): AccountUser
{
    return AccountUser::factory()->create(['account_id' => test()->account->id, 'user_id' => $user->id]);
}

it('rejects action names outside ACTIONS_ATTRS', function () {
    $macro = d3Macro(['actions' => [['action_name' => 'update_last_seen']]]);

    expect($macro->actionsValidationError())
        ->toBe('Macro execution actions update_last_seen not supported.')
        ->and(d3Macro(['actions' => [['action_name' => 'send_message', 'action_params' => ['hi']]]])->actionsValidationError())
        ->toBeNull();
});

it('lets an administrator switch visibility but pins an agent to personal', function () {
    $macro = d3Macro(['actions' => []]);
    expect($macro->visibility)->toBe('personal');

    $macro->setVisibility($this->adminMembership, 'global');
    expect($macro->visibility)->toBe('global')
        ->and($macro->isGlobal())->toBeTrue();

    $macro->setVisibility($this->adminMembership, 'personal');
    expect($macro->visibility)->toBe('personal');

    $agent = User::factory()->create();
    $macro->setVisibility(d3AgentMembership($agent), 'global');
    expect($macro->visibility)->toBe('personal');
});

it('scopes visibility to global macros plus the caller own personal ones', function () {
    $agentOne = User::factory()->create();
    $agentTwo = User::factory()->create();

    d3Macro(['visibility' => 'global']);
    d3Macro(['visibility' => 'global']);
    d3Macro(['visibility' => 'personal']);
    d3Macro(['visibility' => 'personal']);
    d3Macro(['visibility' => 'personal', 'created_by_id' => $agentOne->id, 'updated_by_id' => $agentOne->id]);
    d3Macro(['visibility' => 'personal', 'created_by_id' => $agentTwo->id, 'updated_by_id' => $agentTwo->id]);
    d3Macro(['visibility' => 'personal', 'created_by_id' => $agentTwo->id, 'updated_by_id' => $agentTwo->id]);

    // Macro của account khác không được lọt vào.
    Macro::factory()->global()->create(['account_id' => Account::factory()->create()->id]);

    expect(Macro::withVisibility($this->account, $this->admin)->count())->toBe(4)
        ->and(Macro::withVisibility($this->account, $agentOne)->count())->toBe(3)
        ->and(Macro::withVisibility($this->account, $agentTwo)->count())->toBe(4)
        ->and(Macro::withVisibility($this->account, $agentTwo)->pluck('id')->all())
        ->toBe(Macro::withVisibility($this->account, $agentTwo)->pluck('id')->sort()->values()->all());
});

it('drops personal macros with their author and orphans the global ones', function () {
    $agent = User::factory()->create();
    d3AgentMembership($agent);

    $globalMacro = d3Macro(['visibility' => 'global', 'created_by_id' => $agent->id, 'updated_by_id' => $agent->id]);
    $personalMacro = d3Macro(['visibility' => 'personal', 'created_by_id' => $agent->id, 'updated_by_id' => $agent->id]);

    $agent->delete();

    expect($globalMacro->fresh()->created_by_id)->toBeNull()
        ->and($globalMacro->fresh()->updated_by_id)->toBeNull()
        ->and(Macro::find($personalMacro->id))->toBeNull();
});
