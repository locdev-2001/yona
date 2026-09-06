<?php

use App\Models\Account;
use App\Models\AgentBot;
use App\Models\AgentBotInbox;
use App\Models\Inbox;

it('tạo access token và secret ngay khi tạo bot', function () {
    $bot = AgentBot::factory()->create();

    expect($bot->secret)->toHaveLength(24)
        ->and($bot->accessToken)->not->toBeNull()
        ->and($bot->accessToken->owner_type)->toBe('AgentBot');
});

it('scope accessibleTo lấy bot của account và system bot', function () {
    $account = Account::factory()->create();
    $own = AgentBot::factory()->create(['account_id' => $account->id]);
    $system = AgentBot::factory()->systemBot()->create();
    AgentBot::factory()->create(['account_id' => Account::factory()->create()->id]);

    expect(AgentBot::query()->accessibleTo($account)->pluck('id')->sort()->values()->all())
        ->toBe(collect([$own->id, $system->id])->sort()->values()->all())
        ->and($system->isSystemBot())->toBeTrue();
});

it('agent_bot_inbox lấy account_id từ inbox và nối được inbox với bot', function () {
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);
    $bot = AgentBot::factory()->create(['account_id' => $account->id]);

    $agentBotInbox = AgentBotInbox::query()->create([
        'inbox_id' => $inbox->id,
        'agent_bot_id' => $bot->id,
    ]);

    expect($agentBotInbox->account_id)->toBe($account->id)
        ->and($agentBotInbox->isActive())->toBeTrue()
        ->and($inbox->refresh()->agentBot->id)->toBe($bot->id);
});

it('webhookData và pushEventData theo bản gốc', function () {
    $bot = AgentBot::factory()->create(['name' => 'Bot A']);

    expect($bot->webhookData())->toBe(['id' => $bot->id, 'name' => 'Bot A', 'type' => 'agent_bot'])
        ->and($bot->pushEventData()['type'])->toBe('agent_bot');
});
