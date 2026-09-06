<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Integrations\Hook;
use App\Models\User;
use Illuminate\Support\Facades\Http;

// Port từ spec/requests/api/v1/accounts/integrations/slack_request_spec.rb.

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->admin = User::factory()->create();
    AccountUser::factory()->administrator()->create(['account_id' => $this->account->id, 'user_id' => $this->admin->id]);
    $this->hook = Hook::factory()->create(['account_id' => $this->account->id, 'reference_id' => 'C1']);
});

it('POST từ chối người chưa đăng nhập', function () {
    $this->postJson("/api/v1/accounts/{$this->account->id}/integrations/slack", [])->assertUnauthorized();
});

it('POST tạo hook và trả về app slack', function () {
    Http::fake(['https://slack.com/api/oauth.v2.access' => Http::response(['ok' => true, 'access_token' => 'xoxb-new'])]);

    $response = $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/integrations/slack", ['code' => 'abc'])
        ->assertOk();

    expect($response->json('id'))->toBe('slack');
});

it('PUT từ chối người chưa đăng nhập', function () {
    $this->putJson("/api/v1/accounts/{$this->account->id}/integrations/slack", [])->assertUnauthorized();
});

it('PUT cập nhật hook khi channel hợp lệ', function () {
    Http::fake([
        'https://slack.com/api/conversations.list*' => Http::response([
            'ok' => true, 'channels' => [['id' => 'C1', 'name' => 'general', 'is_private' => false]], 'response_metadata' => ['next_cursor' => ''],
        ]),
        'https://slack.com/api/conversations.join' => Http::response(['ok' => true]),
    ]);

    $response = $this->actingAs($this->admin)
        ->putJson("/api/v1/accounts/{$this->account->id}/integrations/slack", ['reference_id' => 'C1'])
        ->assertOk();

    expect($response->json('hooks.0.id'))->toBe($this->hook->id);
});

it('PUT trả lỗi khi channel không hợp lệ', function () {
    Http::fake(['https://slack.com/api/conversations.list*' => Http::response([
        'ok' => true, 'channels' => [], 'response_metadata' => ['next_cursor' => ''],
    ])]);

    $response = $this->actingAs($this->admin)
        ->putJson("/api/v1/accounts/{$this->account->id}/integrations/slack", ['reference_id' => 'unknown'])
        ->assertStatus(422);

    expect($response->json('error'))->toBe('Invalid slack channel. Please try again');
});

it('GET list_all_channels từ chối người chưa đăng nhập', function () {
    $this->getJson("/api/v1/accounts/{$this->account->id}/integrations/slack/list_all_channels")->assertUnauthorized();
});

it('GET list_all_channels trả danh sách kênh rút gọn', function () {
    Http::fake(function ($request) {
        $isPublic = str_contains($request->body(), 'public_channel');

        return Http::response([
            'ok' => true,
            'channels' => $isPublic ? [['id' => '1', 'name' => 'channel-1']] : [],
            'response_metadata' => ['next_cursor' => ''],
        ]);
    });

    $response = $this->actingAs($this->admin)
        ->getJson("/api/v1/accounts/{$this->account->id}/integrations/slack/list_all_channels")
        ->assertOk();

    expect($response->json())->toBe([['id' => '1', 'name' => 'channel-1']]);
});

it('DELETE từ chối người chưa đăng nhập', function () {
    $this->deleteJson("/api/v1/accounts/{$this->account->id}/integrations/slack")->assertUnauthorized();
});

it('DELETE xoá hook', function () {
    $this->actingAs($this->admin)
        ->deleteJson("/api/v1/accounts/{$this->account->id}/integrations/slack")
        ->assertOk();

    expect(Hook::query()->find($this->hook->id))->toBeNull();
});
