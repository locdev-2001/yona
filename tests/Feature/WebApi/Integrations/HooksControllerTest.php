<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Inbox;
use App\Models\Integrations\Hook;
use App\Models\User;

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->admin = User::factory()->create();
    AccountUser::factory()->administrator()->create([
        'account_id' => $this->account->id,
        'user_id' => $this->admin->id,
    ]);
    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $this->dialogflowPayload = [
        'app_id' => 'dialogflow',
        'inbox_id' => $this->inbox->id,
        'settings' => [
            'project_id' => 'xx',
            'credentials' => ['type' => 'service_account'],
            'region' => 'europe-west1',
        ],
    ];
});

it('từ chối người chưa đăng nhập và agent khi tạo hook', function () {
    $this->postJson("/api/v1/accounts/{$this->account->id}/integrations/hooks", $this->dialogflowPayload)
        ->assertUnauthorized();

    $this->actingAs($this->agent)
        ->postJson("/api/v1/accounts/{$this->account->id}/integrations/hooks", $this->dialogflowPayload)
        ->assertUnauthorized();

    expect(Hook::query()->count())->toBe(0);
});

it('administrator tạo hook kèm kiểu hook lấy từ danh mục và access token tự sinh', function () {
    $response = $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/integrations/hooks", $this->dialogflowPayload)
        ->assertOk();

    $hook = Hook::query()->first();

    expect($response->json('app_id'))->toBe('dialogflow')
        ->and($response->json('hook_type'))->toBe('inbox')
        ->and($response->json('status'))->toBeTrue()
        ->and($response->json('inbox.id'))->toBe($this->inbox->id)
        ->and($hook->hook_type)->toBe(Hook::TYPE_INBOX)
        ->and($hook->access_token)->toHaveLength(24);
});

it('nhận payload bọc trong khoá hook như ParamsWrapper', function () {
    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/integrations/hooks", ['hook' => $this->dialogflowPayload])
        ->assertOk();

    expect(Hook::query()->count())->toBe(1);
});

it('chỉ trả settings + reference_id cho administrator, và lọc theo visible_properties', function () {
    $hook = Hook::factory()->create([
        'account_id' => $this->account->id,
        'app_id' => 'slack',
        'reference_id' => 'C123',
        'settings' => ['channel_name' => 'general', 'không_hiển_thị' => 'x'],
    ]);

    $adminApps = $this->actingAs($this->admin)
        ->getJson("/api/v1/accounts/{$this->account->id}/integrations/apps")
        ->assertOk()
        ->json('payload');

    $slack = collect($adminApps)->firstWhere('id', 'slack');

    // Slack chỉ hiện khi có SLACK_CLIENT_SECRET; hook vẫn phải đọc được qua show.
    $shown = $this->actingAs($this->admin)
        ->getJson("/api/v1/accounts/{$this->account->id}/integrations/apps/slack")
        ->assertOk();

    expect($shown->json('hooks.0.id'))->toBe($hook->id)
        ->and($shown->json('hooks.0.settings'))->toBe(['channel_name' => 'general'])
        ->and($shown->json('hooks.0.reference_id'))->toBe('C123')
        ->and($slack === null || $slack['enabled'])->toBeTrue();

    $agentView = $this->actingAs($this->agent)
        ->getJson("/api/v1/accounts/{$this->account->id}/integrations/apps/slack")
        ->assertOk();

    expect($agentView->json('hooks.0'))->not->toHaveKey('settings')
        ->and($agentView->json('hooks.0'))->not->toHaveKey('reference_id');
});

it('chặn hook thứ hai của app không cho phép nhiều hook', function () {
    Hook::factory()->create(['account_id' => $this->account->id, 'app_id' => 'slack']);

    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/integrations/hooks", ['app_id' => 'slack'])
        ->assertStatus(422)
        ->assertJsonPath('message', 'App has already been taken');

    expect(Hook::query()->count())->toBe(1);
});

it('cho nhiều hook với app khai allow_multiple_hooks', function () {
    $secondInbox = Inbox::factory()->create(['account_id' => $this->account->id]);

    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/integrations/hooks", $this->dialogflowPayload)
        ->assertOk();

    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/integrations/hooks", [
            ...$this->dialogflowPayload,
            'inbox_id' => $secondInbox->id,
        ])
        ->assertOk();

    expect(Hook::query()->count())->toBe(2);
});

it('từ chối settings sai lược đồ của app', function () {
    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/integrations/hooks", [
            ...$this->dialogflowPayload,
            'settings' => ['project_id' => 'xx'],
        ])
        ->assertStatus(422)
        ->assertJsonPath('message', 'Settings : Invalid settings data')
        ->assertJsonPath('attributes', ['settings']);

    expect(Hook::query()->count())->toBe(0);
});

it('bắt buộc inbox_id với app kiểu inbox', function () {
    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/integrations/hooks", [
            ...$this->dialogflowPayload,
            'inbox_id' => null,
        ])
        ->assertStatus(422)
        ->assertJsonPath('message', "Inbox can't be blank");
});

it('từ chối app đang tắt theo cờ tính năng', function () {
    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/integrations/hooks", ['app_id' => 'linear'])
        ->assertStatus(422)
        ->assertJsonPath('message', 'Feature flag Feature not enabled');
});

it('administrator cập nhật status và settings, giữ nguyên app_id', function () {
    $hook = Hook::factory()->create(['account_id' => $this->account->id, 'app_id' => 'slack']);

    $this->actingAs($this->agent)
        ->patchJson("/api/v1/accounts/{$this->account->id}/integrations/hooks/{$hook->id}", ['status' => 'disabled'])
        ->assertUnauthorized();

    $this->actingAs($this->admin)
        ->patchJson("/api/v1/accounts/{$this->account->id}/integrations/hooks/{$hook->id}", [
            'app_id' => 'dialogflow',
            'status' => 'disabled',
            'settings' => ['channel_name' => 'random'],
        ])
        ->assertOk()
        ->assertJsonPath('app_id', 'slack')
        ->assertJsonPath('status', false);

    expect($hook->refresh()->isDisabled())->toBeTrue()
        ->and($hook->settings)->toBe(['channel_name' => 'random']);
});

it('process_event trả về No processor found', function () {
    $hook = Hook::factory()->create(['account_id' => $this->account->id]);

    $this->postJson("/api/v1/accounts/{$this->account->id}/integrations/hooks/{$hook->id}/process_event", [
        'event' => 'rephrase',
    ])->assertUnauthorized();

    $this->actingAs($this->agent)
        ->postJson("/api/v1/accounts/{$this->account->id}/integrations/hooks/{$hook->id}/process_event", [
            'event' => 'rephrase',
        ])
        ->assertStatus(422)
        ->assertJsonPath('error', 'No processor found');
});

it('chỉ administrator xoá được hook, và không đụng account khác', function () {
    $hook = Hook::factory()->create(['account_id' => $this->account->id]);
    $foreign = Hook::factory()->create(['account_id' => Account::factory()->create()->id]);

    $this->actingAs($this->agent)
        ->deleteJson("/api/v1/accounts/{$this->account->id}/integrations/hooks/{$hook->id}")
        ->assertUnauthorized();

    $this->actingAs($this->admin)
        ->deleteJson("/api/v1/accounts/{$this->account->id}/integrations/hooks/{$foreign->id}")
        ->assertNotFound();

    $this->actingAs($this->admin)
        ->deleteJson("/api/v1/accounts/{$this->account->id}/integrations/hooks/{$hook->id}")
        ->assertOk();

    expect(Hook::query()->whereKey($hook->id)->exists())->toBeFalse();
});
