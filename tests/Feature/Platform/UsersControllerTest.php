<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\PlatformApp;
use App\Models\User;

// Port từ refs/chatwoot/spec/controllers/platform/api/v1/users_controller_spec.rb.
beforeEach(function () {
    $this->platformApp = PlatformApp::factory()->create();
    $this->headers = ['api_access_token' => $this->platformApp->accessToken->token];
});

it('tạo user đã xác nhận sẵn và cấp quyền cho app', function () {
    $response = $this->postJson('/platform/api/v1/users', [
        'name' => 'Platform User',
        'email' => 'platform@example.com',
        'password' => 'Password1!',
    ], $this->headers)->assertOk();

    $user = User::query()->where('email', 'platform@example.com')->firstOrFail();

    expect($user->isConfirmed())->toBeTrue()
        ->and($response->json('access_token'))->toBe($user->accessToken->token)
        ->and($response->json('accounts'))->toBe([])
        ->and($this->platformApp->permits($user))->toBeTrue();
});

it('trả lại user sẵn có khi email đã tồn tại', function () {
    $existing = User::factory()->create(['email' => 'existing@example.com']);

    $response = $this->postJson('/platform/api/v1/users', [
        'name' => 'Khác',
        'email' => 'existing@example.com',
        'password' => 'Password1!',
    ], $this->headers)->assertOk();

    expect($response->json('id'))->toBe($existing->id)
        ->and(User::query()->where('email', 'existing@example.com')->count())->toBe(1);
});

it('gộp custom_attributes khi cập nhật', function () {
    $user = User::factory()->create(['custom_attributes' => ['a' => 1]]);
    $this->platformApp->permit($user);

    $response = $this->patchJson("/platform/api/v1/users/{$user->id}", [
        'custom_attributes' => ['b' => 2],
    ], $this->headers)->assertOk();

    expect($response->json('custom_attributes'))->toBe(['a' => 1, 'b' => 2]);
});

it('trả link đăng nhập một lần và token ứng dụng', function () {
    $user = User::factory()->create();
    $this->platformApp->permit($user);

    $loginUrl = $this->getJson("/platform/api/v1/users/{$user->id}/login", $this->headers)
        ->assertOk()->json('url');

    expect($loginUrl)->toContain('/app/login?')
        ->and($loginUrl)->toContain('sso_auth_token=');

    $this->postJson("/platform/api/v1/users/{$user->id}/token", [], $this->headers)
        ->assertOk()
        ->assertJsonPath('access_token', $user->accessToken->token)
        ->assertJsonPath('user.id', $user->id);
});

it('link sso đăng nhập được đúng một lần', function () {
    $user = User::factory()->create();
    $this->platformApp->permit($user);

    $url = $this->getJson("/platform/api/v1/users/{$user->id}/login", $this->headers)->json('url');
    parse_str((string) parse_url($url, PHP_URL_QUERY), $query);

    // Trang /app/login nhận token qua prop rồi tự POST lại (created() của bản gốc).
    $this->get(parse_url($url, PHP_URL_PATH).'?'.parse_url($url, PHP_URL_QUERY))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('ssoAuthToken', $query['sso_auth_token'])->where('email', $user->email));

    $this->post('/app/login', ['email' => $user->email, 'sso_auth_token' => $query['sso_auth_token']])
        ->assertRedirect('/app');
    expect(auth()->guard('web')->id())->toBe($user->id);

    auth()->guard('web')->logout();
    $this->post('/app/login', ['email' => $user->email, 'sso_auth_token' => $query['sso_auth_token']])
        ->assertSessionHasErrors('email');
    expect(auth()->guard('web')->id())->toBeNull();
});

it('liệt kê account của user trong payload', function () {
    $user = User::factory()->create();
    $account = Account::factory()->create();
    AccountUser::factory()->administrator()->create(['account_id' => $account->id, 'user_id' => $user->id]);
    $this->platformApp->permit($user);

    $response = $this->getJson("/platform/api/v1/users/{$user->id}", $this->headers)->assertOk();

    expect($response->json('accounts.0.id'))->toBe($account->id)
        ->and($response->json('accounts.0.role'))->toBe('administrator')
        ->and($response->json('role'))->toBe('administrator');
});

it('chặn user không được cấp quyền', function () {
    $user = User::factory()->create();

    $this->getJson("/platform/api/v1/users/{$user->id}", $this->headers)
        ->assertStatus(401)
        ->assertJson(['error' => 'Non permissible resource']);
});
