<?php

use App\Models\ContactInbox;
use Illuminate\Broadcasting\BroadcastManager;
use Tests\Support\WidgetSession;

// Nợ ghi ở B4: kênh realtime của khách (contact_inbox.pubsub_token) chưa có
// callback auth. RoomChannel#current_user nhánh `params[:user_id].blank?`.

// Đổi driver SAU khi dựng dữ liệu: tạo contact bắn contact.created, mà driver
// reverb trong test không có server thật để nhận.
function useReverbBroadcaster(): void
{
    config([
        'broadcasting.default' => 'reverb',
        'broadcasting.connections.reverb.key' => 'test-key',
        'broadcasting.connections.reverb.secret' => 'test-secret',
        'broadcasting.connections.reverb.app_id' => '1',
    ]);
    app(BroadcastManager::class)->purge('reverb');
    require base_path('routes/channels.php');
}

it('authorizes the visitor on the pubsub_token of their own session', function () {
    $session = WidgetSession::make();
    useReverbBroadcaster();

    $response = $this->postJson($session->url('broadcasting/auth'), [
        'channel_name' => 'private-'.$session->contactInbox->pubsub_token,
        'socket_id' => '1234.5678',
    ], $session->headers())->assertOk();

    expect($response->json('auth'))->toStartWith('test-key:');
});

it('refuses to sign a channel that is not the visitor own session', function () {
    $session = WidgetSession::make();
    $other = ContactInbox::factory()->create(['inbox_id' => $session->inbox->id]);
    useReverbBroadcaster();

    $this->postJson($session->url('broadcasting/auth'), [
        'channel_name' => 'private-'.$other->pubsub_token,
        'socket_id' => '1234.5678',
    ], $session->headers())->assertForbidden();
});

it('rejects a visitor without a session token', function () {
    $session = WidgetSession::make();
    useReverbBroadcaster();

    $this->postJson($session->url('broadcasting/auth'), [
        'channel_name' => 'private-'.$session->contactInbox->pubsub_token,
        'socket_id' => '1234.5678',
    ])->assertNotFound();
});

it('does not let an unknown pubsub_token authorize on the dashboard endpoint', function () {
    useReverbBroadcaster();

    $this->postJson('/broadcasting/auth', [
        'channel_name' => 'private-'.str_repeat('z', 24),
        'socket_id' => '1234.5678',
        'pubsub_token' => str_repeat('z', 24),
    ])->assertForbidden();
});

it('lets a visitor authorize on the dashboard endpoint with their pubsub_token', function () {
    $session = WidgetSession::make();
    useReverbBroadcaster();

    $this->postJson('/broadcasting/auth', [
        'channel_name' => 'private-'.$session->contactInbox->pubsub_token,
        'socket_id' => '1234.5678',
        'pubsub_token' => $session->contactInbox->pubsub_token,
    ])->assertOk();
});
