<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Inbox;
use App\Models\User;

// #160: màn "Thêm kênh" lấy danh sách lối vào từ driver kênh. SMS ẩn, kênh thiếu app
// nền tảng tự ẩn; hộp thư SMS cũ vẫn còn nguyên.

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->admin = User::factory()->create();
    AccountUser::factory()->administrator()->create(['account_id' => $this->account->id, 'user_id' => $this->admin->id]);
    config(['services.facebook.app_id' => null, 'services.facebook.app_secret' => null]);
});

function connectionKeys(array $payload): array
{
    return array_column($payload, 'key');
}

it('API trả các lối vào đang mở theo thứ tự, không có SMS', function () {
    $payload = $this->actingAs($this->admin)
        ->getJson("/api/v1/accounts/{$this->account->id}/channel_connections")
        ->assertOk()
        ->json('payload');

    expect(connectionKeys($payload))->toBe(['zalo', 'website', 'email', 'telegram', 'line', 'whatsapp', 'api']);

    $methods = array_column($payload, 'method', 'key');
    expect($methods)->toMatchArray([
        'zalo' => 'qr',
        'website' => 'form',
        'email' => 'form',
        'telegram' => 'token',
        'line' => 'token',
    ]);
});

it('Facebook chỉ hiện khi bản cài đặt có app Meta (client id + secret)', function () {
    config(['services.facebook.app_id' => '123', 'services.facebook.app_secret' => null]);

    expect(connectionKeys($this->actingAs($this->admin)
        ->getJson("/api/v1/accounts/{$this->account->id}/channel_connections")->json('payload')))->not->toContain('facebook');

    config(['services.facebook.app_secret' => 'secret']);

    $payload = $this->actingAs($this->admin)->getJson("/api/v1/accounts/{$this->account->id}/channel_connections")->json('payload');

    expect(array_column($payload, 'method', 'key')['facebook'] ?? null)->toBe('oauth_popup');
});

it('Telegram kèm đường mở BotFather; Email chỉ mở đăng nhập Google, Outlook và Khác sắp ra mắt', function () {
    config(['services.google_mail.enabled' => true, 'services.google_mail.client_id' => 'g', 'services.google_mail.client_secret' => 's']);
    $payload = collect($this->actingAs($this->admin)
        ->getJson("/api/v1/accounts/{$this->account->id}/channel_connections")->json('payload'))->keyBy('key');

    expect($payload['telegram']['guide_url'])->toBe('https://t.me/BotFather');

    $email = collect($payload['email']['options'])->keyBy('key');

    expect($email->keys()->all())->not->toContain('gmail')
        ->and($email['google']['coming_soon'])->toBeFalse()
        ->and($email['google']['start_url'])->toBe("/app/accounts/{$this->account->id}/email/oauth/google")
        ->and($email['outlook']['coming_soon'])->toBeTrue()
        ->and($email['other']['coming_soon'])->toBeTrue()
        ->and($email['microsoft']['coming_soon'])->toBeTrue()
        ->and($email['microsoft']['start_url'])->toBeNull();
});

it('agent không xem được danh sách lối vào', function () {
    $agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $agent->id, 'role' => AccountUser::ROLE_AGENT]);

    $this->actingAs($agent)->getJson("/api/v1/accounts/{$this->account->id}/channel_connections")->assertStatus(401);
});

it('màn chọn kênh nhận đúng danh sách từ backend', function () {
    $this->actingAs($this->admin)
        ->get("/app/accounts/{$this->account->id}/settings/inboxes/new")
        ->assertInertia(fn ($page) => $page
            ->component('dashboard/settings/inboxes/NewChannelList')
            ->where('channels.0.key', 'zalo')
            ->where('channels', fn ($channels) => ! collect($channels)->pluck('key')->contains('sms')));
});

it('mở thẳng URL bước 2 của kênh đã ẩn thì quay về màn chọn kênh', function (string $key) {
    $this->actingAs($this->admin)
        ->get("/app/accounts/{$this->account->id}/settings/inboxes/new/{$key}")
        ->assertRedirect("/app/accounts/{$this->account->id}/settings/inboxes/new");
})->with(['sms', 'facebook', 'instagram', 'tiktok', 'khong_co']);

it('bước 2 của kênh đang mở nhận kèm giao kèo kết nối', function () {
    config(['services.google_mail.enabled' => true, 'services.google_mail.client_id' => 'g', 'services.google_mail.client_secret' => 's']);

    $this->actingAs($this->admin)
        ->get("/app/accounts/{$this->account->id}/settings/inboxes/new/email")
        ->assertInertia(fn ($page) => $page
            ->component('dashboard/settings/inboxes/NewChannel')
            ->where('channelName', 'email')
            ->where('connection.method', 'form')
            ->where('connection.options.0.key', 'google')
            ->where('connection.options.0.coming_soon', false));
});

it('hộp thư SMS cũ vẫn còn và vẫn mở được sau khi ẩn SMS', function () {
    $inbox = Inbox::factory()->sms()->create(['account_id' => $this->account->id]);

    $this->actingAs($this->admin)
        ->getJson("/api/v1/accounts/{$this->account->id}/inboxes/{$inbox->id}")
        ->assertOk()
        ->assertJsonPath('channel_type', 'Channel::Sms');
});
