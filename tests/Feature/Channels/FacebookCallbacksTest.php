<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Channel\FacebookPage;
use App\Models\Inbox;
use App\Models\User;
use Illuminate\Support\Facades\Http;

// Port từ spec/controllers/api/v1/accounts/callbacks_controller_spec.rb.

beforeEach(function () {
    config()->set('services.facebook.app_id', 'fb-app');
    config()->set('services.facebook.app_secret', 'fb-secret');

    $this->account = Account::factory()->create();
    $this->administrator = User::factory()->create();
    AccountUser::factory()->administrator()->create([
        'account_id' => $this->account->id,
        'user_id' => $this->administrator->id,
    ]);
    $this->url = "/api/v1/accounts/{$this->account->id}/callbacks";
});

it('liệt kê trang Facebook và đánh dấu trang đã kết nối', function () {
    FacebookPage::factory()->create(['account_id' => $this->account->id, 'page_id' => 'page-1']);

    Http::fake([
        'graph.facebook.com/*/oauth/access_token*' => Http::response(['access_token' => 'long-token']),
        'graph.facebook.com/*/me/accounts*' => Http::response(['data' => [
            ['id' => 'page-1', 'name' => 'Trang cũ', 'access_token' => 'tok-1'],
            ['id' => 'page-2', 'name' => 'Trang mới', 'access_token' => 'tok-2'],
        ]]),
    ]);

    $response = $this->actingAs($this->administrator)
        ->getJson("{$this->url}/facebook_pages?omniauth_token=short-token")
        ->assertOk();

    $pages = $response->json('data.page_details');

    expect($pages)->toHaveCount(2)
        ->and($pages[0]['exists'])->toBeTrue()
        ->and($pages[1]['exists'])->toBeFalse();
});

it('tạo inbox Facebook từ trang đã chọn', function () {
    Http::fake([
        'graph.facebook.com/*/me?*' => Http::response(['instagram_business_account' => ['id' => 'ig-123']]),
        'graph.facebook.com/*' => Http::response([]),
    ]);

    $this->actingAs($this->administrator)->postJson("{$this->url}/register_facebook_page", [
        'page_id' => 'page-9',
        'user_access_token' => 'user-token',
        'page_access_token' => 'page-token',
        'inbox_name' => 'Fanpage Yona',
    ])->assertOk();

    $inbox = Inbox::query()->where('account_id', $this->account->id)->latest('id')->first();

    expect($inbox->name)->toBe('Fanpage Yona')
        ->and($inbox->channel_type)->toBe('Channel::FacebookPage')
        ->and($inbox->channel->page_id)->toBe('page-9')
        ->and($inbox->channel->instagram_id)->toBe('ig-123');
});

it('cấp quyền lại cho trang đã kết nối', function () {
    $inbox = Inbox::factory()->facebookPage()->create(['account_id' => $this->account->id]);
    $inbox->channel->update(['account_id' => $this->account->id, 'page_id' => 'page-7']);

    Http::fake([
        'graph.facebook.com/*/oauth/access_token*' => Http::response(['access_token' => 'long-token']),
        'graph.facebook.com/*/me/accounts*' => Http::response(['data' => [['id' => 'page-7', 'access_token' => 'tok-moi']]]),
        'graph.facebook.com/*' => Http::response([]),
    ]);

    $this->actingAs($this->administrator)
        ->postJson("{$this->url}/reauthorize_page/{$inbox->id}", ['omniauth_token' => 'short-token'])
        ->assertOk();

    expect($inbox->channel->fresh()->page_access_token)->toBe('tok-moi');
});

it('trả 422 khi inbox không phải kênh Facebook', function () {
    $inbox = Inbox::factory()->create(['account_id' => $this->account->id]);

    $this->actingAs($this->administrator)
        ->postJson("{$this->url}/reauthorize_page/{$inbox->id}", ['omniauth_token' => 'short-token'])
        ->assertStatus(422);
});
