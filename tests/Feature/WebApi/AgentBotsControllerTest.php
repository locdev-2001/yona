<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\AgentBot;
use App\Models\AgentBotInbox;
use App\Models\Inbox;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->admin = User::factory()->create();
    AccountUser::factory()->administrator()->create([
        'account_id' => $this->account->id,
        'user_id' => $this->admin->id,
    ]);
    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);
});

it('liệt kê bot của account cùng system bot, giấu secret với agent', function () {
    $bot = AgentBot::factory()->create(['account_id' => $this->account->id]);
    $systemBot = AgentBot::factory()->systemBot()->create();
    AgentBot::factory()->create(['account_id' => Account::factory()->create()->id]);

    $adminList = $this->actingAs($this->admin)
        ->getJson("/api/v1/accounts/{$this->account->id}/agent_bots")
        ->assertOk()
        ->json();

    expect(collect($adminList)->pluck('id')->sort()->values()->all())
        ->toBe(collect([$bot->id, $systemBot->id])->sort()->values()->all());

    $own = collect($adminList)->firstWhere('id', $bot->id);
    expect($own['secret'])->toBe($bot->secret)
        ->and($own['access_token'])->toBe($bot->accessToken->token)
        ->and($own['system_bot'])->toBeFalse()
        ->and($own['bot_type'])->toBe('webhook');

    $system = collect($adminList)->firstWhere('id', $systemBot->id);
    expect($system)->not->toHaveKey('secret')
        ->and($system)->not->toHaveKey('outgoing_url')
        ->and($system['system_bot'])->toBeTrue();

    $agentList = $this->actingAs($this->agent)
        ->getJson("/api/v1/accounts/{$this->account->id}/agent_bots")
        ->assertOk()
        ->json();

    expect(collect($agentList)->firstWhere('id', $bot->id))->not->toHaveKey('secret');
});

it('chỉ administrator được tạo, sửa, xoá bot', function () {
    $this->actingAs($this->agent)
        ->postJson("/api/v1/accounts/{$this->account->id}/agent_bots", ['name' => 'Bot'])
        ->assertUnauthorized();

    $response = $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/agent_bots", [
            'name' => 'Support bot',
            'description' => 'Trả lời tự động',
            'outgoing_url' => 'https://example.com/bot',
        ])
        ->assertOk();

    $botId = $response->json('id');
    expect($response->json('outgoing_url'))->toBe('https://example.com/bot')
        ->and($response->json('secret'))->toHaveLength(24)
        ->and(AgentBot::query()->find($botId)->accessToken)->not->toBeNull();

    $this->actingAs($this->admin)
        ->patchJson("/api/v1/accounts/{$this->account->id}/agent_bots/{$botId}", ['name' => 'Bot mới'])
        ->assertOk()
        ->assertJsonPath('name', 'Bot mới');

    $this->actingAs($this->admin)
        ->deleteJson("/api/v1/accounts/{$this->account->id}/agent_bots/{$botId}")
        ->assertOk();

    expect(AgentBot::query()->whereKey($botId)->exists())->toBeFalse();
});

it('sinh lại access token và secret', function () {
    $bot = AgentBot::factory()->create(['account_id' => $this->account->id]);
    $oldToken = $bot->accessToken->token;
    $oldSecret = $bot->secret;

    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/agent_bots/{$bot->id}/reset_access_token")
        ->assertOk();

    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/agent_bots/{$bot->id}/reset_secret")
        ->assertOk();

    $bot->refresh()->load('accessToken');
    expect($bot->accessToken->token)->not->toBe($oldToken)
        ->and($bot->secret)->not->toBe($oldSecret);
});

it('không cho sửa system bot hay bot của account khác', function () {
    $systemBot = AgentBot::factory()->systemBot()->create();
    $foreignBot = AgentBot::factory()->create(['account_id' => Account::factory()->create()->id]);

    $this->actingAs($this->admin)
        ->patchJson("/api/v1/accounts/{$this->account->id}/agent_bots/{$systemBot->id}", ['name' => 'x'])
        ->assertNotFound();

    $this->actingAs($this->admin)
        ->getJson("/api/v1/accounts/{$this->account->id}/agent_bots/{$foreignBot->id}")
        ->assertNotFound();
});

it('đọc và gán agent bot cho inbox', function () {
    $inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $inbox->addMembers([$this->admin->id]);
    $bot = AgentBot::factory()->create(['account_id' => $this->account->id]);

    $this->actingAs($this->admin)
        ->getJson("/api/v1/accounts/{$this->account->id}/inboxes/{$inbox->id}/agent_bot")
        ->assertOk()
        ->assertJsonPath('agent_bot', []);

    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/inboxes/{$inbox->id}/set_agent_bot", ['agent_bot' => $bot->id])
        ->assertOk();

    expect(AgentBotInbox::query()->where('inbox_id', $inbox->id)->first())
        ->agent_bot_id->toBe($bot->id)
        ->account_id->toBe($this->account->id);

    $this->actingAs($this->admin)
        ->getJson("/api/v1/accounts/{$this->account->id}/inboxes/{$inbox->id}/agent_bot")
        ->assertOk()
        ->assertJsonPath('agent_bot.id', $bot->id);

    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/inboxes/{$inbox->id}/set_agent_bot", ['agent_bot' => null])
        ->assertOk();

    expect(AgentBotInbox::query()->where('inbox_id', $inbox->id)->exists())->toBeFalse();
});

it('xoá ảnh đại diện bot thì lưu lại bot và trả bot không còn ảnh', function () {
    Storage::fake('public');
    $bot = AgentBot::factory()->create(['account_id' => $this->account->id]);
    $bot->replaceAvatar(UploadedFile::fake()->image('avatar.png'));
    $updatedAtBeforeRemoval = $bot->refresh()->updated_at;
    $this->travel(1)->minutes();

    $this->actingAs($this->admin)
        ->deleteJson("/api/v1/accounts/{$this->account->id}/agent_bots/{$bot->id}/avatar")
        ->assertOk()
        ->assertJsonPath('thumbnail', '');

    $bot->refresh();
    expect($bot->avatar)->toBeNull()
        ->and($bot->updated_at->greaterThan($updatedAtBeforeRemoval))->toBeTrue();
});
