<?php

use App\Jobs\Inboxes\FetchImapEmailsJob;
use App\Models\Account;
use App\Models\Channel\Email;
use App\Models\Inbox;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;

// Pub/Sub đẩy báo Gmail có thư mới: chỉ token OIDC hợp lệ của đúng service account mới
// kích hoạt quét IMAP ngay; mọi trường hợp đều trả 204 để Pub/Sub không thử lại vô ích.

const GMAIL_PUSH_AUDIENCE = 'https://yona.vn/webhooks/gmail/push';
const GMAIL_PUSH_SERVICE_ACCOUNT = 'pubsub-push@yona-511104.iam.gserviceaccount.com';

beforeEach(function () {
    Queue::fake();
    Cache::flush();
    config([
        'services.google_mail.pubsub_audience' => GMAIL_PUSH_AUDIENCE,
        'services.google_mail.pubsub_service_account' => GMAIL_PUSH_SERVICE_ACCOUNT,
    ]);
    $this->signingKey = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
    Http::fake(['www.googleapis.com/oauth2/v1/certs' => Http::response([
        'kid-1' => openssl_pkey_get_details($this->signingKey)['key'],
    ])]);

    $account = Account::factory()->create();
    $this->channel = Email::factory()->create(['account_id' => $account->id, 'email' => 'shop@gmail.com', 'provider' => 'google']);
    Inbox::factory()->create(['account_id' => $account->id, 'channel_id' => $this->channel->id, 'channel_type' => 'Channel::Email']);
});

function pubSubToken($test, array $claims = [], string $kid = 'kid-1', $key = null): string
{
    $encode = fn (string $value) => rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    $header = $encode(json_encode(['alg' => 'RS256', 'kid' => $kid, 'typ' => 'JWT']));
    $payload = $encode(json_encode([
        'iss' => 'https://accounts.google.com',
        'aud' => GMAIL_PUSH_AUDIENCE,
        'email' => GMAIL_PUSH_SERVICE_ACCOUNT,
        'email_verified' => true,
        'iat' => time(),
        'exp' => time() + 3600,
        ...$claims,
    ]));
    openssl_sign("{$header}.{$payload}", $signature, $key ?? $test->signingKey, OPENSSL_ALGO_SHA256);

    return "{$header}.{$payload}.".$encode($signature);
}

function pushGmail($test, ?string $token, string $emailAddress = 'Shop@Gmail.com')
{
    $body = ['message' => [
        'data' => base64_encode(json_encode(['emailAddress' => $emailAddress, 'historyId' => '123456'])),
        'messageId' => '1',
    ], 'subscription' => 'projects/yona-511104/subscriptions/gmail-inbox-push'];

    return $test->withHeaders($token === null ? [] : ['Authorization' => "Bearer {$token}"])
        ->postJson('/webhooks/gmail/push', $body);
}

it('token hợp lệ thì quét ngay hộp Gmail khớp địa chỉ, báo dồn dập gộp một lượt', function () {
    pushGmail($this, pubSubToken($this))->assertNoContent();
    pushGmail($this, pubSubToken($this))->assertNoContent();

    Queue::assertPushed(FetchImapEmailsJob::class, 1);
    Queue::assertPushed(FetchImapEmailsJob::class, fn (FetchImapEmailsJob $job) => $job->channel->is($this->channel));
});

it('token sai thì trả 204 nhưng không quét', function (Closure $token) {
    pushGmail($this, $token($this))->assertNoContent();

    Queue::assertNothingPushed();
})->with([
    'thiếu token' => [fn () => null],
    'sai audience' => [fn ($test) => pubSubToken($test, ['aud' => 'https://ke-khac.vn/push'])],
    'sai service account' => [fn ($test) => pubSubToken($test, ['email' => 'ai-do@evil.iam.gserviceaccount.com'])],
    'hết hạn' => [fn ($test) => pubSubToken($test, ['exp' => time() - 3600])],
    'sai nơi cấp' => [fn ($test) => pubSubToken($test, ['iss' => 'https://evil.example.com'])],
    'ký bằng khoá khác' => [fn ($test) => pubSubToken($test, key: openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]))],
    'kid lạ' => [fn ($test) => pubSubToken($test, kid: 'kid-khong-co')],
    'chuỗi rác' => [fn () => 'khong.phai.jwt'],
]);

it('không khớp hộp Gmail nào thì 204, không quét', function () {
    pushGmail($this, pubSubToken($this), 'nguoi-khac@gmail.com')->assertNoContent();

    Queue::assertNothingPushed();
});

it('chưa cấu hình audience thì không tin token nào', function () {
    config(['services.google_mail.pubsub_audience' => null]);

    pushGmail($this, pubSubToken($this))->assertNoContent();

    Queue::assertNothingPushed();
});

it('khoá công khai của Google được nhớ, không tải lại mỗi lần đẩy', function () {
    Cache::flush();
    $this->travel(10)->seconds();
    pushGmail($this, pubSubToken($this));
    $this->travel(10)->seconds();
    pushGmail($this, pubSubToken($this));

    Http::assertSentCount(1);
});
