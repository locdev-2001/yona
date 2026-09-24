<?php

use App\Models\Account;
use App\Models\AgentBot;
use App\Models\PlatformApp;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->platformApp = PlatformApp::factory()->create();
    $this->headers = ['api_access_token' => $this->platformApp->accessToken->token];
});

it('tạo bot và cấp quyền cho app', function () {
    $account = Account::factory()->create();

    $response = $this->postJson('/platform/api/v1/agent_bots', [
        'name' => 'Bot mới',
        'description' => 'mô tả',
        'outgoing_url' => 'https://example.com/hook',
        'account_id' => $account->id,
    ], $this->headers)->assertOk();

    $bot = AgentBot::query()->latest('id')->first();

    expect($response->json('name'))->toBe('Bot mới')
        ->and($response->json('access_token'))->toBe($bot->accessToken->token)
        ->and($this->platformApp->permits($bot))->toBeTrue();
});

it('chỉ liệt kê bot được cấp quyền', function () {
    $mine = AgentBot::factory()->create();
    AgentBot::factory()->create();
    $this->platformApp->permit($mine);

    $response = $this->getJson('/platform/api/v1/agent_bots', $this->headers)->assertOk();

    expect($response->json())->toHaveCount(1)
        ->and($response->json('0.id'))->toBe($mine->id);
});

it('cập nhật và xoá bot', function () {
    $bot = AgentBot::factory()->create();
    $this->platformApp->permit($bot);

    $this->patchJson("/platform/api/v1/agent_bots/{$bot->id}", ['name' => 'Đổi tên'], $this->headers)
        ->assertOk()
        ->assertJsonPath('name', 'Đổi tên');

    $this->deleteJson("/platform/api/v1/agent_bots/{$bot->id}", [], $this->headers)->assertOk();

    expect(AgentBot::query()->find($bot->id))->toBeNull();
});

it('xoá ảnh đại diện bot thì lưu lại bot', function () {
    Storage::fake('public');
    $bot = AgentBot::factory()->create();
    $this->platformApp->permit($bot);
    $bot->replaceAvatar(UploadedFile::fake()->image('avatar.png'));
    $updatedAtBeforeRemoval = $bot->refresh()->updated_at;
    $this->travel(1)->minutes();

    $this->deleteJson("/platform/api/v1/agent_bots/{$bot->id}/avatar", [], $this->headers)
        ->assertOk()
        ->assertJsonPath('id', $bot->id);

    $bot->refresh();
    expect($bot->avatar)->toBeNull()
        ->and($bot->updated_at->greaterThan($updatedAtBeforeRemoval))->toBeTrue();
});

it('chặn bot không được cấp quyền', function () {
    $bot = AgentBot::factory()->create();

    $this->getJson("/platform/api/v1/agent_bots/{$bot->id}", $this->headers)->assertStatus(401);
});
