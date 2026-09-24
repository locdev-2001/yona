<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Channel\Line;
use App\Models\Channel\Telegram;
use App\Models\Inbox;
use App\Models\User;
use App\Services\Channels\ChannelSetupService;
use Illuminate\Support\Facades\Http;

// Các bước đăng ký webhook của Telegram, Facebook, Twilio, WhatsApp gom vào ChannelSetupService.

function administratorOf(Account $account): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create([
        'account_id' => $account->id,
        'user_id' => $user->id,
        'role' => AccountUser::ROLE_ADMINISTRATOR,
    ]);

    return $user;
}

function createInboxAs(User $user, Account $account, array $payload)
{
    return test()->actingAs($user)->postJson("/api/v1/accounts/{$account->id}/inboxes", $payload);
}

beforeEach(function () {
    config()->set('app.url', 'https://yona.test');
    $this->account = Account::factory()->create();
    $this->admin = administratorOf($this->account);
});

describe('Telegram', function () {
    it('gọi setWebhook và lấy bot_name khi tạo inbox', function () {
        Http::fake([
            'api.telegram.org/*getMe*' => Http::response(['ok' => true, 'result' => ['username' => 'yona_bot']]),
            'api.telegram.org/*' => Http::response(['ok' => true, 'result' => true]),
        ]);

        $response = createInboxAs($this->admin, $this->account, [
            'name' => 'Bot bán hàng',
            'channel' => ['type' => 'telegram', 'bot_token' => '123456:AAH-token'],
        ])->assertOk();

        expect($response->json('bot_name'))->toBe('yona_bot')
            ->and($response->json('callback_webhook_url'))->toBe('https://yona.test/webhooks/telegram/123456:AAH-token');

        Http::assertSent(fn ($request) => str_contains($request->url(), '/deleteWebhook'));
        Http::assertSent(fn ($request) => str_contains($request->url(), '/setWebhook')
            && $request['url'] === 'https://yona.test/webhooks/telegram/123456:AAH-token');
    });

    it('lấy tên inbox từ username của bot khi người dùng không đặt tên', function () {
        Http::fake([
            'api.telegram.org/*getMe*' => Http::response(['ok' => true, 'result' => ['username' => 'shop_bot']]),
            'api.telegram.org/*' => Http::response(['ok' => true, 'result' => true]),
        ]);

        $response = createInboxAs($this->admin, $this->account, [
            'channel' => ['type' => 'telegram', 'bot_token' => '123456:AAH-no-name'],
        ])->assertOk();

        expect($response->json('name'))->toBe('shop_bot');
    });

    it('vẫn tạo được inbox khi Telegram trả lỗi', function () {
        Http::fake(['api.telegram.org/*' => Http::response(['ok' => false, 'description' => 'Unauthorized'], 401)]);

        $response = createInboxAs($this->admin, $this->account, [
            'name' => 'Bot hỏng',
            'channel' => ['type' => 'telegram', 'bot_token' => 'token-sai'],
        ])->assertOk();

        expect(Telegram::findByBotToken('token-sai'))->not->toBeNull()
            ->and($response->json('bot_name'))->toBeNull()
            ->and($response->json('name'))->toBe('Bot hỏng');
    });
});

describe('LINE', function () {
    it('không gọi nhà cung cấp nhưng vẫn trả URL webhook để khai báo', function () {
        Http::fake();

        $response = createInboxAs($this->admin, $this->account, [
            'name' => 'LINE OA',
            'channel' => [
                'type' => 'line',
                'line_channel_id' => '1657000',
                'line_channel_secret' => 'secret',
                'line_channel_token' => 'token',
            ],
        ])->assertOk();

        expect($response->json('callback_webhook_url'))->toBe('https://yona.test/webhooks/line/1657000')
            ->and(Line::query()->where('line_channel_id', '1657000')->exists())->toBeTrue();

        Http::assertNothingSent();
    });
});

describe('Twilio', function () {
    it('trỏ số điện thoại về callback của Yona', function () {
        Http::fake([
            'api.twilio.com/*IncomingPhoneNumbers.json*' => Http::response([
                'incoming_phone_numbers' => [['sid' => 'PN123']],
            ]),
            'api.twilio.com/*' => Http::response([]),
        ]);

        $response = createInboxAs($this->admin, $this->account, [
            'name' => 'Twilio SMS',
            'channel' => [
                'type' => 'twilio',
                'account_sid' => 'AC123',
                'auth_token' => 'auth',
                'phone_number' => '+15551234567',
                'medium' => 'sms',
            ],
        ])->assertOk();

        expect($response->json('medium'))->toBe('sms')
            ->and($response->json('phone_number'))->toBe('+15551234567')
            ->and($response->json('callback_webhook_url'))->toBe('https://yona.test/twilio/callback');

        Http::assertSent(fn ($request) => str_contains($request->url(), 'IncomingPhoneNumbers/PN123.json')
            && $request['SmsUrl'] === 'https://yona.test/twilio/callback');
    });

    it('cập nhật messaging service khi kênh dùng messaging_service_sid', function () {
        Http::fake();

        createInboxAs($this->admin, $this->account, [
            'name' => 'Twilio MS',
            'channel' => [
                'type' => 'twilio',
                'account_sid' => 'AC123',
                'auth_token' => 'auth',
                'messaging_service_sid' => 'MG123',
                'medium' => 'whatsapp',
            ],
        ])->assertOk();

        Http::assertSent(fn ($request) => $request->url() === 'https://messaging.twilio.com/v1/Services/MG123'
            && $request['InboundRequestUrl'] === 'https://yona.test/twilio/callback');
    });
});

describe('WhatsApp Cloud', function () {
    it('đăng ký app với WABA rồi ghi đè callback theo số', function () {
        Http::fake(['graph.facebook.com/*' => Http::response(['success' => true])]);

        $response = createInboxAs($this->admin, $this->account, [
            'name' => 'WhatsApp',
            'channel' => [
                'type' => 'whatsapp',
                'phone_number' => '+15551230000',
                'provider' => 'whatsapp_cloud',
                'provider_config' => [
                    'api_key' => 'meta-key',
                    'phone_number_id' => '10001',
                    'business_account_id' => '20002',
                ],
            ],
        ])->assertOk();

        expect($response->json('callback_webhook_url'))->toBe('https://yona.test/webhooks/whatsapp/+15551230000')
            ->and($response->json('provider_config.webhook_verify_token'))->not->toBeEmpty();

        Http::assertSent(fn ($request) => str_contains($request->url(), '/20002/subscribed_apps'));
        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/10001')
            && $request['webhook_configuration']['override_callback_uri'] === 'https://yona.test/webhooks/whatsapp/+15551230000');
    });

    it('bỏ qua kênh 360dialog (provider default)', function () {
        Http::fake();

        createInboxAs($this->admin, $this->account, [
            'name' => '360dialog',
            'channel' => [
                'type' => 'whatsapp',
                'phone_number' => '+15559990000',
                'provider_config' => ['api_key' => 'key-360'],
            ],
        ])->assertOk();

        Http::assertNothingSent();
    });
});

describe('Facebook / Instagram', function () {
    it('đăng ký nhận sự kiện cho trang Facebook khi tạo qua callback', function () {
        Http::fake([
            'graph.facebook.com/*oauth/access_token*' => Http::response(['access_token' => 'long-lived']),
            'graph.facebook.com/*' => Http::response(['data' => []]),
        ]);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/callbacks/register_facebook_page", [
                'page_id' => '55555',
                'user_access_token' => 'user-token',
                'page_access_token' => 'page-token',
                'inbox_name' => 'Trang Acme',
            ])
            ->assertOk();

        Http::assertSent(fn ($request) => str_contains($request->url(), '/55555/subscribed_apps'));
    });

    it('đăng ký subscribed_apps cho Instagram khi tạo inbox', function () {
        Http::fake(['graph.instagram.com/*' => Http::response(['success' => true])]);

        createInboxAs($this->admin, $this->account, [
            'name' => 'IG shop',
            'channel' => [
                'type' => 'instagram',
                'instagram_id' => '178000',
                'access_token' => 'IGQ-token',
                'expires_at' => '2026-12-31T00:00:00Z',
            ],
        ])->assertOk();

        Http::assertSent(fn ($request) => str_contains($request->url(), '/178000/subscribed_apps'));
    });
});

it('không có bước đăng ký nào cho kênh không cần webhook ngoài', function () {
    Http::fake();

    $inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    app(ChannelSetupService::class)->register($inbox);

    Http::assertNothingSent();
    expect(ChannelSetupService::callbackUrlFor($inbox))->toBeNull();
});
