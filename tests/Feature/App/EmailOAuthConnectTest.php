<?php

use App\Http\Resources\InboxResource;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Channel\Email;
use App\Models\Inbox;
use App\Models\User;
use App\Services\Email\MailServerException;
use App\Services\Email\OAuth\EmailOAuthTokenManager;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

// #161: kết nối hộp thư email bằng OAuth Google/Microsoft qua giao kèo kết nối kênh.

beforeEach(function () {
    config([
        'services.microsoft_mail.client_id' => 'ms-client',
        'services.microsoft_mail.client_secret' => 'ms-secret',
        'services.microsoft_mail.tenant' => 'common',
        'services.google_mail.enabled' => false,
        'services.google_mail.client_id' => 'g-client',
        'services.google_mail.client_secret' => 'g-secret',
    ]);
    $this->account = Account::factory()->create();
    $this->admin = User::factory()->create();
    AccountUser::factory()->administrator()->create(['account_id' => $this->account->id, 'user_id' => $this->admin->id]);
});

function fakeIdToken(string $email): string
{
    $encode = fn (array $part) => rtrim(strtr(base64_encode(json_encode($part)), '+/', '-_'), '=');

    return $encode(['alg' => 'none']).'.'.$encode(['email' => $email, 'preferred_username' => $email]).'.sig';
}

function emailOptions($test): array
{
    $payload = collect($test->actingAs($test->admin)
        ->getJson("/api/v1/accounts/{$test->account->id}/channel_connections")->json('payload'))->keyBy('key');

    return collect($payload['email']['options'])->keyBy('key')->all();
}

function oauthState(array $overrides = []): array
{
    return ['email_oauth_state.state-123' => [
        'account_id' => test()->account->id,
        'user_id' => test()->admin->id,
        'provider' => 'microsoft',
        'inbox_id' => null,
        ...$overrides,
    ]];
}

function oauthEmailInbox(Account $account, array $config): Inbox
{
    $channel = Email::factory()->create([
        'account_id' => $account->id,
        'email' => 'shop@outlook.com',
        'provider' => 'microsoft',
        'imap_enabled' => true,
        'imap_address' => 'outlook.office365.com',
        'imap_port' => 993,
        'imap_login' => 'shop@outlook.com',
        'provider_config' => $config,
    ]);

    return Inbox::factory()->create(['account_id' => $account->id, 'channel_id' => $channel->id, 'channel_type' => 'Channel::Email']);
}

it('Gmail OAuth ẩn khi cờ tắt dù đã có client id; Outlook hiện sắp ra mắt, không bắt đầu được', function () {
    $options = emailOptions($this);

    expect($options)->not->toHaveKey('google')
        ->and($options['microsoft']['method'])->toBe('oauth_redirect')
        ->and($options['microsoft']['coming_soon'])->toBeTrue()
        ->and($options['microsoft']['start_url'])->toBeNull();

    $this->actingAs($this->admin)->get("/app/accounts/{$this->account->id}/email/oauth/google")->assertNotFound();
    $this->actingAs($this->admin)->get("/app/accounts/{$this->account->id}/email/oauth/microsoft")->assertNotFound();

    config(['services.google_mail.enabled' => true]);

    expect(emailOptions($this))->toHaveKey('google')
        ->and(emailOptions($this)['google']['coming_soon'])->toBeFalse();
});

it('thiếu client secret Azure thì kết nối lại Outlook cũng không bắt đầu được', function () {
    config(['services.microsoft_mail.client_secret' => null]);
    $inbox = oauthEmailInbox($this->account, ['refresh_token' => 'cu']);

    $this->actingAs($this->admin)
        ->get("/app/accounts/{$this->account->id}/email/oauth/microsoft?inbox_id={$inbox->id}")
        ->assertNotFound();
});

it('kết nối lại hộp Outlook đã nối chuyển sang Microsoft với scope IMAP/SMTP, state lưu trong session', function () {
    $inbox = oauthEmailInbox($this->account, ['refresh_token' => 'cu']);
    $response = $this->actingAs($this->admin)
        ->get("/app/accounts/{$this->account->id}/email/oauth/microsoft?inbox_id={$inbox->id}")
        ->assertRedirect();

    $location = $response->headers->get('Location');
    parse_str((string) parse_url($location, PHP_URL_QUERY), $query);

    expect($location)->toStartWith('https://login.microsoftonline.com/common/oauth2/v2.0/authorize?')
        ->and($query['client_id'])->toBe('ms-client')
        ->and($query['scope'])->toBe('https://outlook.office.com/IMAP.AccessAsUser.All https://outlook.office.com/SMTP.Send offline_access email openid')
        ->and($query['redirect_uri'])->toEndWith('/app/email/oauth/microsoft/callback')
        ->and(session('email_oauth_state.'.$query['state']))->toMatchArray([
            'account_id' => $this->account->id, 'provider' => 'microsoft', 'inbox_id' => $inbox->id,
        ]);
});

it('Gmail OAuth (khi đã mở) xin scope https://mail.google.com/ kèm refresh token', function () {
    config(['services.google_mail.enabled' => true]);

    $location = $this->actingAs($this->admin)->get("/app/accounts/{$this->account->id}/email/oauth/google")->headers->get('Location');
    parse_str((string) parse_url($location, PHP_URL_QUERY), $query);

    expect($location)->toStartWith('https://accounts.google.com/o/oauth2/v2/auth?')
        ->and($query['scope'])->toBe('https://mail.google.com/ email openid')
        ->and($query['access_type'])->toBe('offline');
});

it('callback lưu token (mã hoá), tạo hộp thư Gmail rồi sang bước gán agent', function () {
    config(['services.google_mail.enabled' => true]);
    Http::fake(['oauth2.googleapis.com/*' => Http::response([
        'access_token' => 'access-1',
        'refresh_token' => 'refresh-1',
        'expires_in' => 3600,
        'id_token' => fakeIdToken('Shop@Gmail.com'),
    ])]);

    $response = $this->actingAs($this->admin)->withSession(oauthState(['provider' => 'google']))
        ->get('/app/email/oauth/google/callback?code=code-1&state=state-123');

    $channel = Email::query()->where('email', 'shop@gmail.com')->firstOrFail();
    $inbox = $channel->inbox;

    $response->assertRedirect("/app/accounts/{$this->account->id}/settings/inboxes/new/{$inbox->id}/agents");

    expect($channel->provider)->toBe('google')
        ->and($channel->imap_enabled)->toBeTrue()
        ->and($channel->imap_address)->toBe('imap.gmail.com')
        ->and($channel->imap_login)->toBe('shop@gmail.com')
        ->and($channel->provider_config['access_token'])->toBe('access-1')
        ->and($channel->provider_config['refresh_token'])->toBe('refresh-1')
        ->and($inbox->name)->toBe('shop@gmail.com');

    $raw = (string) DB::table('channel_email')->where('id', $channel->id)->value('provider_config');
    expect($raw)->not->toContain('refresh-1')->not->toContain('access-1');

    Http::assertSent(fn (HttpRequest $request) => $request['grant_type'] === 'authorization_code'
        && $request['code'] === 'code-1'
        && str_ends_with($request['redirect_uri'], '/app/email/oauth/google/callback'));
});

it('callback tạo hộp mới của nhà cung cấp sắp ra mắt thì từ chối, không tạo gì', function () {
    Http::fake();

    $this->actingAs($this->admin)->withSession(oauthState())
        ->get('/app/email/oauth/microsoft/callback?code=code-1&state=state-123')
        ->assertNotFound();

    expect(Email::query()->count())->toBe(0);
    Http::assertNothingSent();
});

it('callback sai state thì từ chối, không tạo gì', function () {
    Http::fake();

    $this->actingAs($this->admin)->withSession(oauthState())
        ->get('/app/email/oauth/microsoft/callback?code=code-1&state=khac')
        ->assertForbidden();

    expect(Email::query()->count())->toBe(0);
    Http::assertNothingSent();
});

it('người dùng huỷ ở trang nhà cung cấp thì quay về form Email kèm lỗi', function () {
    config(['services.google_mail.enabled' => true]);

    $this->actingAs($this->admin)->withSession(oauthState(['provider' => 'google']))
        ->get('/app/email/oauth/google/callback?error=access_denied&state=state-123')
        ->assertRedirect("/app/accounts/{$this->account->id}/settings/inboxes/new/email?oauth_error=denied");
});

it('access token sắp hết hạn thì làm mới bằng refresh token và lưu lại', function () {
    Http::fake(['login.microsoftonline.com/*' => Http::response(['access_token' => 'access-2', 'expires_in' => 3600])]);
    $inbox = oauthEmailInbox($this->account, [
        'access_token' => 'access-1',
        'refresh_token' => 'refresh-1',
        'expires_at' => now()->subMinute()->toIso8601String(),
    ]);

    $token = app(EmailOAuthTokenManager::class)->accessToken($inbox->channel);

    expect($token)->toBe('access-2')
        ->and($inbox->channel->fresh()->provider_config['access_token'])->toBe('access-2')
        ->and($inbox->channel->fresh()->provider_config['refresh_token'])->toBe('refresh-1');

    Http::assertSent(fn (HttpRequest $request) => $request['grant_type'] === 'refresh_token' && $request['refresh_token'] === 'refresh-1');
});

it('access token còn hạn thì dùng luôn, không gọi nhà cung cấp', function () {
    Http::fake();
    $inbox = oauthEmailInbox($this->account, [
        'access_token' => 'access-1',
        'refresh_token' => 'refresh-1',
        'expires_at' => now()->addHour()->toIso8601String(),
    ]);

    expect(app(EmailOAuthTokenManager::class)->accessToken($inbox->channel))->toBe('access-1');
    Http::assertNothingSent();
});

it('refresh token bị thu hồi thì kênh cần kết nối lại, API trả cờ + đường kết nối lại', function () {
    Http::fake(['login.microsoftonline.com/*' => Http::response(['error' => 'invalid_grant'], 400)]);
    $inbox = oauthEmailInbox($this->account, [
        'access_token' => 'access-1',
        'refresh_token' => 'refresh-thu-hoi',
        'expires_at' => now()->subMinute()->toIso8601String(),
    ]);

    expect(fn () => app(EmailOAuthTokenManager::class)->accessToken($inbox->channel))
        ->toThrow(MailServerException::class);

    expect($inbox->channel->reauthorizationRequired())->toBeTrue();

    $payload = (new InboxResource($inbox->fresh(), true))->toArray(request());

    expect($payload['reauthorization_required'])->toBeTrue()
        ->and($payload['reconnect_url'])->toBe("/app/accounts/{$this->account->id}/email/oauth/microsoft?inbox_id={$inbox->id}");

    $inbox->channel->reauthorized();
});

it('kết nối lại cập nhật đúng hộp thư cũ và gỡ cờ lỗi', function () {
    $inbox = oauthEmailInbox($this->account, ['refresh_token' => 'cu']);
    $inbox->channel->promptReauthorization();
    Http::fake(['login.microsoftonline.com/*' => Http::response([
        'access_token' => 'access-moi',
        'refresh_token' => 'refresh-moi',
        'expires_in' => 3600,
        'id_token' => fakeIdToken('shop@outlook.com'),
    ])]);

    $this->actingAs($this->admin)->withSession(oauthState(['inbox_id' => $inbox->id]))
        ->get('/app/email/oauth/microsoft/callback?code=code-2&state=state-123')
        ->assertRedirect("/app/accounts/{$this->account->id}/settings/inboxes/{$inbox->id}");

    $channel = $inbox->channel->fresh();

    expect(Email::query()->count())->toBe(1)
        ->and($channel->provider_config['refresh_token'])->toBe('refresh-moi')
        ->and($channel->reauthorizationRequired())->toBeFalse();
});

it('kết nối lại bằng tài khoản khác thì không ghi đè hộp thư cũ', function () {
    $inbox = oauthEmailInbox($this->account, ['refresh_token' => 'cu']);
    Http::fake(['login.microsoftonline.com/*' => Http::response([
        'access_token' => 'access-khac',
        'refresh_token' => 'refresh-khac',
        'expires_in' => 3600,
        'id_token' => fakeIdToken('nguoi-khac@outlook.com'),
    ])]);

    $this->actingAs($this->admin)->withSession(oauthState(['inbox_id' => $inbox->id]))
        ->get('/app/email/oauth/microsoft/callback?code=code-3&state=state-123')
        ->assertRedirect("/app/accounts/{$this->account->id}/settings/inboxes/{$inbox->id}?oauth_error=mismatch");

    expect($inbox->channel->fresh()->provider_config['refresh_token'])->toBe('cu');
});
