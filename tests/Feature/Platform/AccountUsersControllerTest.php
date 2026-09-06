<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\PlatformApp;
use App\Models\User;

// Port từ refs/chatwoot/spec/controllers/platform/api/v1/account_users_controller_spec.rb.
beforeEach(function () {
    $this->platformApp = PlatformApp::factory()->create();
    $this->headers = ['api_access_token' => $this->platformApp->accessToken->token];
    $this->account = Account::factory()->create();
    $this->user = User::factory()->create();
});

it('thêm và đổi vai trò của người dùng trong account', function () {
    $this->platformApp->permit($this->account);

    $this->postJson("/platform/api/v1/accounts/{$this->account->id}/account_users", [
        'user_id' => $this->user->id,
        'role' => 'administrator',
    ], $this->headers)->assertOk();

    $accountUser = AccountUser::query()->where('account_id', $this->account->id)->firstOrFail();
    expect($accountUser->role)->toBe(AccountUser::ROLE_ADMINISTRATOR);

    $this->postJson("/platform/api/v1/accounts/{$this->account->id}/account_users", [
        'user_id' => $this->user->id,
        'role' => 'agent',
    ], $this->headers)->assertOk();

    expect(AccountUser::query()->where('account_id', $this->account->id)->count())->toBe(1)
        ->and($accountUser->fresh()->role)->toBe(AccountUser::ROLE_AGENT);
});

it('gỡ người dùng khỏi account', function () {
    $this->platformApp->permit($this->account);
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->user->id]);

    $this->deleteJson("/platform/api/v1/accounts/{$this->account->id}/account_users", [
        'user_id' => $this->user->id,
    ], $this->headers)->assertOk();

    expect(AccountUser::query()->where('account_id', $this->account->id)->count())->toBe(0);
});

it('chặn account không được cấp quyền', function () {
    $this->getJson("/platform/api/v1/accounts/{$this->account->id}/account_users", $this->headers)
        ->assertStatus(401);
});
