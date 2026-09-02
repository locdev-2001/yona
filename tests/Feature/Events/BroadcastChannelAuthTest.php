<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\User;
use Illuminate\Broadcasting\BroadcastManager;

// Port từ spec/channels/room_channel_spec.rb: user nghe được kênh pubsub_token
// của mình và account_{id} mình là thành viên (auth qua session web).

beforeEach(function () {
    // Test chạy BROADCAST_CONNECTION=null (không có auth) — bật reverb với key
    // giả rồi nạp lại routes/channels.php để callback đăng ký lên driver này.
    config([
        'broadcasting.default' => 'reverb',
        'broadcasting.connections.reverb.key' => 'test-key',
        'broadcasting.connections.reverb.secret' => 'test-secret',
        'broadcasting.connections.reverb.app_id' => '1',
    ]);
    app(BroadcastManager::class)->purge('reverb');
    require base_path('routes/channels.php');
});

function authorizeChannel(string $channel)
{
    return test()->postJson('/broadcasting/auth', ['channel_name' => $channel, 'socket_id' => '1234.5678']);
}

it('authorizes the user on their own pubsub_token channel', function () {
    $user = User::factory()->create();

    $response = test()->actingAs($user)->postJson('/broadcasting/auth', [
        'channel_name' => "private-{$user->pubsub_token}", 'socket_id' => '1234.5678',
    ]);

    $response->assertOk();
    expect($response->json('auth'))->toStartWith('test-key:');
});

it('rejects another user pubsub_token', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    test()->actingAs($user)->postJson('/broadcasting/auth', [
        'channel_name' => "private-{$other->pubsub_token}", 'socket_id' => '1234.5678',
    ])->assertForbidden();
});

it('authorizes account channel for members only', function () {
    $account = Account::factory()->create();
    $member = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $member->id]);
    $outsider = User::factory()->create();

    test()->actingAs($member)->postJson('/broadcasting/auth', [
        'channel_name' => "private-account_{$account->id}", 'socket_id' => '1234.5678',
    ])->assertOk();

    test()->actingAs($outsider)->postJson('/broadcasting/auth', [
        'channel_name' => "private-account_{$account->id}", 'socket_id' => '1234.5678',
    ])->assertForbidden();
});

it('rejects guests', function () {
    authorizeChannel('private-account_1')->assertForbidden();
});
