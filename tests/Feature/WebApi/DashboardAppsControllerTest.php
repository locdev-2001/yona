<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\DashboardApp;
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
});

$payload = fn () => ['title' => 'CRM Dashboard', 'content' => [['type' => 'frame', 'url' => 'https://link.com']]];

it('từ chối người chưa đăng nhập', function () {
    $this->getJson("/api/v1/accounts/{$this->account->id}/dashboard_apps")->assertUnauthorized();
});

it('trả về mọi dashboard app của account', function () {
    $dashboardApp = DashboardApp::factory()->create([
        'account_id' => $this->account->id,
        'user_id' => $this->admin->id,
    ]);
    DashboardApp::factory()->create(['account_id' => Account::factory()->create()->id]);

    $response = $this->actingAs($this->agent)
        ->getJson("/api/v1/accounts/{$this->account->id}/dashboard_apps")
        ->assertOk();

    expect($response->json())->toHaveCount(1)
        ->and($response->json('0.title'))->toBe($dashboardApp->title)
        ->and($response->json('0.content.0.url'))->toBe($dashboardApp->content[0]['url']);
});

it('hiện một dashboard app', function () {
    $dashboardApp = DashboardApp::factory()->create(['account_id' => $this->account->id]);

    $this->actingAs($this->agent)
        ->getJson("/api/v1/accounts/{$this->account->id}/dashboard_apps/{$dashboardApp->id}")
        ->assertOk()
        ->assertJsonPath('title', $dashboardApp->title);
});

it('administrator tạo được dashboard app', function () use ($payload) {
    $response = $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/dashboard_apps", ['dashboard_app' => $payload()])
        ->assertOk();

    expect($response->json('title'))->toBe('CRM Dashboard')
        ->and($response->json('content.0.type'))->toBe('frame')
        ->and(DashboardApp::query()->count())->toBe(1)
        ->and(DashboardApp::query()->first()->user_id)->toBe($this->admin->id);
});

it('nhận payload phẳng như ParamsWrapper của Rails', function () use ($payload) {
    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/dashboard_apps", $payload())
        ->assertOk();

    expect(DashboardApp::query()->count())->toBe(1);
});

it('chấp nhận URL không SSL', function () {
    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/dashboard_apps", [
            'title' => 'CRM Dashboard',
            'content' => [['type' => 'frame', 'url' => 'http://link.com']],
        ])
        ->assertOk();

    expect(DashboardApp::query()->count())->toBe(1);
});

it('từ chối nội dung sai lược đồ', function (array $content) {
    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/dashboard_apps", [
            'title' => 'CRM Dashboard',
            'content' => $content,
        ])
        ->assertStatus(422)
        ->assertJsonPath('message', 'Content : Invalid data');

    expect(DashboardApp::query()->count())->toBe(0);
})->with([
    'url không phải URL' => [[['type' => 'frame', 'url' => 'com']]],
    'giao thức không phải http' => [[['type' => 'frame', 'url' => 'ftp://wontwork.example.com/hello']]],
    'type lạ' => [[['type' => 'dda', 'url' => 'https://link.com']]],
    'thiếu url' => [[['type' => 'frame']]],
    'rỗng' => [[]],
]);

it('agent không tạo/sửa/xoá được', function () use ($payload) {
    $dashboardApp = DashboardApp::factory()->create(['account_id' => $this->account->id]);

    $this->actingAs($this->agent)
        ->postJson("/api/v1/accounts/{$this->account->id}/dashboard_apps", $payload())
        ->assertUnauthorized();

    $this->actingAs($this->agent)
        ->patchJson("/api/v1/accounts/{$this->account->id}/dashboard_apps/{$dashboardApp->id}", $payload())
        ->assertUnauthorized();

    $this->actingAs($this->agent)
        ->deleteJson("/api/v1/accounts/{$this->account->id}/dashboard_apps/{$dashboardApp->id}")
        ->assertUnauthorized();

    expect($dashboardApp->refresh()->title)->not->toBe('CRM Dashboard')
        ->and(DashboardApp::query()->count())->toBe(1);
});

it('administrator sửa và xoá dashboard app', function () use ($payload) {
    $dashboardApp = DashboardApp::factory()->create(['account_id' => $this->account->id]);

    $this->actingAs($this->admin)
        ->patchJson("/api/v1/accounts/{$this->account->id}/dashboard_apps/{$dashboardApp->id}", $payload())
        ->assertOk()
        ->assertJsonPath('title', 'CRM Dashboard');

    expect($dashboardApp->refresh()->title)->toBe('CRM Dashboard');

    $this->actingAs($this->admin)
        ->deleteJson("/api/v1/accounts/{$this->account->id}/dashboard_apps/{$dashboardApp->id}")
        ->assertNoContent();

    expect(DashboardApp::query()->count())->toBe(0);
});

it('không đụng được dashboard app của account khác', function () {
    $foreign = DashboardApp::factory()->create(['account_id' => Account::factory()->create()->id]);

    $this->actingAs($this->admin)
        ->getJson("/api/v1/accounts/{$this->account->id}/dashboard_apps/{$foreign->id}")
        ->assertNotFound();
});
