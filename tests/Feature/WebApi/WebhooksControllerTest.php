<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Inbox;
use App\Models\User;
use App\Models\Webhook;

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->admin = User::factory()->create();
    AccountUser::factory()->administrator()->create([
        'account_id' => $this->account->id,
        'user_id' => $this->admin->id,
    ]);
});

it('chỉ cho administrator đọc webhook của account mình', function () {
    $agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $agent->id]);

    $this->actingAs($agent)
        ->getJson("/api/v1/accounts/{$this->account->id}/webhooks")
        ->assertUnauthorized();

    $webhook = Webhook::factory()->create(['account_id' => $this->account->id]);
    Webhook::factory()->create(['account_id' => Account::factory()->create()->id]);

    $response = $this->actingAs($this->admin)
        ->getJson("/api/v1/accounts/{$this->account->id}/webhooks")
        ->assertOk();

    expect($response->json('payload.webhooks'))->toHaveCount(1)
        ->and($response->json('payload.webhooks.0.id'))->toBe($webhook->id)
        ->and($response->json('payload.webhooks.0.secret'))->toBe($webhook->secret);
});

it('tạo webhook kèm secret tự sinh và khối inbox khi có inbox_id', function () {
    $inbox = Inbox::factory()->create(['account_id' => $this->account->id]);

    $response = $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/webhooks", [
            'webhook' => [
                'name' => 'Order sync',
                'url' => 'https://example.com/hook',
                'inbox_id' => $inbox->id,
                'subscriptions' => ['message_created', 'conversation_created'],
            ],
        ])
        ->assertOk();

    expect($response->json('payload.webhook.url'))->toBe('https://example.com/hook')
        ->and($response->json('payload.webhook.inbox.id'))->toBe($inbox->id)
        ->and($response->json('payload.webhook.secret'))->toHaveLength(24)
        ->and($response->json('payload.webhook.subscriptions'))->toBe(['message_created', 'conversation_created']);
});

it('nhận payload phẳng như ParamsWrapper của Rails', function () {
    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/webhooks", [
            'url' => 'https://example.com/flat',
            'subscriptions' => ['message_created'],
        ])
        ->assertOk()
        ->assertJsonPath('payload.webhook.url', 'https://example.com/flat');
});

it('từ chối sự kiện lạ, URL sai định dạng và URL trùng trong account', function () {
    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/webhooks", [
            'url' => 'https://example.com/a',
            'subscriptions' => ['not_a_real_event'],
        ])
        ->assertStatus(422)
        ->assertJsonPath('message', 'Invalid events');

    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/webhooks", [
            'url' => 'ftp://example.com/a',
            'subscriptions' => ['message_created'],
        ])
        ->assertStatus(422)
        ->assertJsonPath('message', 'Url is invalid');

    Webhook::factory()->create(['account_id' => $this->account->id, 'url' => 'https://example.com/dup']);

    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/webhooks", [
            'url' => 'https://example.com/dup',
            'subscriptions' => ['message_created'],
        ])
        ->assertStatus(422)
        ->assertJsonPath('message', 'Url has already been taken');
});

it('sửa và xoá webhook, giữ nguyên secret khi cập nhật', function () {
    $webhook = Webhook::factory()->create(['account_id' => $this->account->id]);
    $secret = $webhook->secret;

    $this->actingAs($this->admin)
        ->patchJson("/api/v1/accounts/{$this->account->id}/webhooks/{$webhook->id}", [
            'webhook' => ['url' => 'https://example.com/renamed', 'subscriptions' => ['contact_created']],
        ])
        ->assertOk()
        ->assertJsonPath('payload.webhook.url', 'https://example.com/renamed')
        ->assertJsonPath('payload.webhook.secret', $secret);

    $this->actingAs($this->admin)
        ->deleteJson("/api/v1/accounts/{$this->account->id}/webhooks/{$webhook->id}")
        ->assertOk();

    expect(Webhook::query()->whereKey($webhook->id)->exists())->toBeFalse();
});
