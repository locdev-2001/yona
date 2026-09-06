<?php

use App\Jobs\DeleteObjectJob;
use App\Models\Account;
use App\Models\PlatformApp;
use App\Models\User;
use Illuminate\Support\Facades\Queue;

// Port từ refs/chatwoot/spec/controllers/platform/api/v1/accounts_controller_spec.rb.
beforeEach(function () {
    $this->platformApp = PlatformApp::factory()->create();
    $this->headers = ['api_access_token' => $this->platformApp->accessToken->token];
});

it('từ chối khi không có token hợp lệ', function () {
    $this->postJson('/platform/api/v1/accounts', ['name' => 'Test'])
        ->assertStatus(401)
        ->assertJson(['error' => 'Invalid access_token']);

    $this->postJson('/platform/api/v1/accounts', ['name' => 'Test'], ['api_access_token' => 'sai'])
        ->assertStatus(401);
});

it('từ chối token của user thường', function () {
    $user = User::factory()->create();

    $this->getJson('/platform/api/v1/accounts', ['api_access_token' => $user->accessToken->token])
        ->assertStatus(401);
});

it('tạo account và tự cấp quyền cho platform app', function () {
    $response = $this->postJson('/platform/api/v1/accounts', [
        'name' => 'Acme Platform',
        'locale' => 'en',
        'custom_attributes' => ['plan' => 'pro'],
    ], $this->headers)->assertOk();

    $account = Account::query()->latest('id')->first();

    expect($response->json('name'))->toBe('Acme Platform')
        ->and($response->json('custom_attributes.plan'))->toBe('pro')
        ->and($response->json('status'))->toBe('active')
        ->and($this->platformApp->permits($account))->toBeTrue();
});

it('bật tắt feature flag qua tham số features', function () {
    $response = $this->postJson('/platform/api/v1/accounts', [
        'name' => 'Feature Account',
        'features' => ['inbound_emails' => true],
    ], $this->headers)->assertOk();

    expect($response->json('features.inbound_emails'))->toBeTrue();

    $account = Account::query()->latest('id')->first();

    $this->patchJson("/platform/api/v1/accounts/{$account->id}", [
        'features' => ['inbound_emails' => false],
    ], $this->headers)->assertOk();

    expect($account->fresh()->featureEnabled('inbound_emails'))->toBeFalse();
});

it('chỉ liệt kê account mà app được cấp quyền', function () {
    $mine = Account::factory()->create();
    Account::factory()->create();
    $this->platformApp->permit($mine);

    $response = $this->getJson('/platform/api/v1/accounts', $this->headers)->assertOk();

    expect($response->json())->toHaveCount(1)
        ->and($response->json('0.id'))->toBe($mine->id);
});

it('chặn thao tác lên account không được cấp quyền', function () {
    $other = Account::factory()->create();

    $this->getJson("/platform/api/v1/accounts/{$other->id}", $this->headers)
        ->assertStatus(401)
        ->assertJson(['error' => 'Non permissible resource']);
});

it('xoá account bằng job nền', function () {
    Queue::fake();
    $account = Account::factory()->create();
    $this->platformApp->permit($account);

    $this->deleteJson("/platform/api/v1/accounts/{$account->id}", [], $this->headers)->assertOk();

    Queue::assertPushed(DeleteObjectJob::class);
});
