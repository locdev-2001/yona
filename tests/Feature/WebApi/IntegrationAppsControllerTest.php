<?php

use App\Models\Account;
use App\Models\AccountUser;
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

it('chỉ trả app đang hoạt động với account', function () {
    $response = $this->actingAs($this->admin)
        ->getJson("/api/v1/accounts/{$this->account->id}/integrations/apps")
        ->assertOk();

    $ids = collect($response->json('payload'))->pluck('id')->all();

    expect($ids)->toContain('webhook', 'dashboard_apps', 'openai', 'dialogflow', 'google_translate', 'dyte')
        // slack/linear/notion/shopify thiếu cấu hình, leadsquared tắt cờ crm_integration.
        ->and($ids)->not->toContain('slack', 'linear', 'notion', 'shopify', 'leadsquared');
});

it('đánh dấu app webhook là enabled khi account đã có webhook', function () {
    $path = "/api/v1/accounts/{$this->account->id}/integrations/apps/webhook";

    $this->actingAs($this->admin)->getJson($path)->assertOk()->assertJsonPath('enabled', false);

    Webhook::factory()->create(['account_id' => $this->account->id]);

    $this->actingAs($this->admin)->getJson($path)
        ->assertOk()
        ->assertJsonPath('enabled', true)
        ->assertJsonPath('name', 'Webhooks')
        ->assertJsonPath('action', '/webhook')
        ->assertJsonPath('button', '/webhook')
        ->assertJsonPath('hooks', []);
});

it('giấu khối cấu hình với agent và trả 404 cho app lạ', function () {
    $agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $agent->id]);

    $payload = $this->actingAs($agent)
        ->getJson("/api/v1/accounts/{$this->account->id}/integrations/apps/openai")
        ->assertOk()
        ->json();

    expect($payload)->not->toHaveKey('action')
        ->and($payload)->not->toHaveKey('settings_form_schema')
        ->and($payload['short_description'])->toBe('AI-powered reply suggestions, summarization, and message enhancement.');

    $this->actingAs($this->admin)
        ->getJson("/api/v1/accounts/{$this->account->id}/integrations/apps/khong_ton_tai")
        ->assertNotFound();
});
