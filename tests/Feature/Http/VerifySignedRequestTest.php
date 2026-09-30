<?php

use App\Http\RequestSigning\SignedRequestProtocol as Protocol;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\PlatformApp;
use App\Models\User;
use Illuminate\Auth\Events\Login;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\Support\WidgetSession;

// Request dựng tay ở đây (không qua trait ký tự động của TestCase) để sửa từng phần của chữ ký.

function signingGrantFor(WidgetSession $session): array
{
    return test()->withoutRequestSigning()
        ->postJson($session->url('request_signing_key'), [], $session->headers())
        ->assertOk()
        ->json();
}

function sealedJson(array $grant, array $payload): string
{
    return json_encode([Protocol::ENCRYPTED_FIELD => Protocol::encrypt(base64_decode($grant['encryption_key']), json_encode($payload))]);
}

/**
 * @param  array<string, string>  $headers
 * @param  array{signed_body?: string, timestamp?: string, key_id?: string, nonce?: string, signature?: string, omit?: string}  $overrides
 */
function sendSigned(array $grant, string $method, string $uri, array $headers, string $body, array $overrides = []): TestResponse
{
    $timestamp = $overrides['timestamp'] ?? (string) now()->getTimestamp();
    $nonce = $overrides['nonce'] ?? Str::random(22);
    $canonical = Protocol::canonical($method, $uri, $timestamp, $nonce, Protocol::rawBodyDigest($overrides['signed_body'] ?? $body));
    $signingHeaders = [
        Protocol::HEADER_KEY_ID => $overrides['key_id'] ?? $grant['key_id'],
        Protocol::HEADER_TIMESTAMP => $timestamp,
        Protocol::HEADER_NONCE => $nonce,
        Protocol::HEADER_SIGNATURE => $overrides['signature'] ?? Protocol::sign(base64_decode($grant['signing_key']), $canonical),
    ];
    unset($signingHeaders[$overrides['omit'] ?? '']);

    $server = ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'];
    foreach ([...$headers, ...$signingHeaders] as $name => $value) {
        $server['HTTP_'.strtoupper(str_replace('-', '_', $name))] = $value;
    }

    return test()->withoutRequestSigning()->call($method, $uri, [], [], [], $server, $body);
}

function dashboardAgentWithConversation(): array
{
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);
    $contact = Contact::factory()->create(['account_id' => $account->id]);
    $contactInbox = ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $inbox->id]);
    $conversation = Conversation::factory()->create([
        'account_id' => $account->id,
        'inbox_id' => $inbox->id,
        'contact_id' => $contact->id,
        'contact_inbox_id' => $contactInbox->id,
    ]);
    $agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $agent->id, 'role' => AccountUser::ROLE_AGENT]);
    $inbox->addMembers([$agent->id]);

    return [$agent, $conversation, "/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages"];
}

describe('widget: signed + encrypted messaging requests', function () {
    it('accepts a correctly signed, encrypted message and hands the decrypted payload to the core', function () {
        $session = WidgetSession::make();
        $grant = signingGrantFor($session);

        sendSigned($grant, 'POST', $session->url('messages'), $session->headers(), sealedJson($grant, ['message' => ['content' => '  Xin chào  ']]))
            ->assertOk();

        expect(Message::query()->where('content', 'Xin chào')->exists())->toBeTrue();
    });

    it('rejects a request whose signature, key, clock, body or encryption is not right', function (Closure $tamper, int $status, string $reason) {
        $session = WidgetSession::make();
        $grant = signingGrantFor($session);
        $body = sealedJson($grant, ['message' => ['content' => 'hello']]);
        Log::spy();

        sendSigned($grant, 'POST', $session->url('messages'), $session->headers(), ...$tamper($grant, $body))
            ->assertStatus($status)
            ->assertJsonPath('reason', $reason);

        expect(Message::query()->count())->toBe(0);
        Log::shouldHaveReceived('warning')->withArgs(fn (string $event, array $context) => $event === 'request_signing.rejected' && $context['reason'] === $reason);
    })->with([
        'missing signature header' => [fn ($grant, $body) => [$body, ['omit' => Protocol::HEADER_SIGNATURE]], 428, 'missing_headers'],
        'missing key id header' => [fn ($grant, $body) => [$body, ['omit' => Protocol::HEADER_KEY_ID]], 428, 'missing_headers'],
        'expired timestamp' => [fn ($grant, $body) => [$body, ['timestamp' => (string) (now()->getTimestamp() - 3600)]], 428, 'clock_skew'],
        'timestamp from the future' => [fn ($grant, $body) => [$body, ['timestamp' => (string) (now()->getTimestamp() + 3600)]], 428, 'clock_skew'],
        'unknown key' => [fn ($grant, $body) => [$body, ['key_id' => 'forged-key']], 428, 'unknown_key'],
        'wrong signature' => [fn ($grant, $body) => [$body, ['signature' => str_repeat('0', 64)]], 400, 'bad_signature'],
        'body changed after signing' => [fn ($grant, $body) => [sealedJson($grant, ['message' => ['content' => 'spam']]), ['signed_body' => $body]], 400, 'bad_signature'],
        'plain JSON body, correctly signed' => [fn ($grant, $body) => [json_encode(['message' => ['content' => 'hello']])], 400, 'unencrypted_or_corrupt_payload'],
        'envelope sealed with another key' => [fn ($grant, $body) => [json_encode([Protocol::ENCRYPTED_FIELD => Protocol::encrypt(random_bytes(32), '{"message":{"content":"x"}}')])], 400, 'unencrypted_or_corrupt_payload'],
    ]);

    it('rejects a replayed request (same nonce) even though it is otherwise valid', function () {
        $session = WidgetSession::make();
        $grant = signingGrantFor($session);
        $body = sealedJson($grant, ['message' => ['content' => 'once']]);
        $replay = ['nonce' => 'fixed-nonce', 'timestamp' => (string) now()->getTimestamp()];

        sendSigned($grant, 'POST', $session->url('messages'), $session->headers(), $body, $replay)->assertOk();
        sendSigned($grant, 'POST', $session->url('messages'), $session->headers(), $body, $replay)
            ->assertStatus(409)
            ->assertJsonPath('error', 'request_nonce_reused');

        expect(Message::query()->where('content', 'once')->count())->toBe(1);
    });

    it('refuses a key issued to another visitor', function () {
        $session = WidgetSession::make();
        $otherVisitor = ContactInbox::factory()->create(['inbox_id' => $session->inbox->id, 'contact_id' => $session->contact->id]);
        $grantOfOtherVisitor = test()->withoutRequestSigning()
            ->postJson($session->url('request_signing_key'), [], $session->headers($otherVisitor))
            ->json();

        sendSigned($grantOfOtherVisitor, 'POST', $session->url('messages'), $session->headers(), sealedJson($grantOfOtherVisitor, ['message' => ['content' => 'x']]))
            ->assertStatus(428)
            ->assertJsonPath('reason', 'unknown_key');
    });

    it('signs multipart uploads over the file hashes and rejects a swapped file', function () {
        $session = WidgetSession::make();
        $grant = signingGrantFor($session);
        $uri = $session->url('messages');
        $fields = [Protocol::ENCRYPTED_FIELD => Protocol::encrypt(base64_decode($grant['encryption_key']), 'message%5Bcontent%5D=caption')];
        $signedFile = UploadedFile::fake()->createWithContent('a.txt', 'original');
        $swappedFile = UploadedFile::fake()->createWithContent('a.txt', 'swapped!');
        $send = function (UploadedFile $sentFile, string $nonce) use ($grant, $uri, $fields, $session, $signedFile) {
            $timestamp = (string) now()->getTimestamp();
            $digest = Protocol::multipartDigest($fields, [['sha256' => hash('sha256', 'original'), 'size' => $signedFile->getSize()]]);
            $server = [
                'HTTP_ACCEPT' => 'application/json',
                'HTTP_X_AUTH_TOKEN' => $session->token(),
                'HTTP_X_SIG_KEY_ID' => $grant['key_id'],
                'HTTP_X_SIG_TIMESTAMP' => $timestamp,
                'HTTP_X_SIG_NONCE' => $nonce,
                'HTTP_X_SIG' => Protocol::sign(base64_decode($grant['signing_key']), Protocol::canonical('POST', $uri, $timestamp, $nonce, $digest)),
            ];

            return test()->withoutRequestSigning()->call('POST', $uri, $fields, [], ['message' => ['attachments' => [$sentFile]]], $server);
        };

        $send($swappedFile, 'n-1')->assertStatus(400)->assertJsonPath('reason', 'bad_signature');
        $send($signedFile, 'n-2')->assertOk();

        expect(Message::query()->where('content', 'caption')->sole()->attachments)->toHaveCount(1);
    });

    it('lets everything through unsigned when the global switch is off', function () {
        config(['request_protection.signing.enabled' => false]);
        $session = WidgetSession::make();

        test()->withoutRequestSigning()->postJson($session->url('request_signing_key'), [], $session->headers())
            ->assertOk()
            ->assertExactJson(['enabled' => false]);
        test()->withoutRequestSigning()->postJson($session->url('messages'), ['message' => ['content' => 'plain']], $session->headers())
            ->assertOk();
    });

    it('publishes the protected routes so the client needs no hardcoded list', function () {
        $grant = signingGrantFor(WidgetSession::make());

        expect(collect($grant['protected_routes'])->pluck('pattern'))
            ->toContain('^/api/v1/widget/messages$', '^/api/v1/widget/messages/[^/]+$', '^/api/v1/widget/conversations$')
            ->not->toContain('^/api/v1/widget/config$');
    });
});

describe('dashboard: signed messaging requests', function () {
    it('requires signing for session requests but not for Application API tokens', function () {
        [$agent, , $uri] = dashboardAgentWithConversation();

        test()->withoutRequestSigning()->actingAs($agent)->postJson($uri, ['content' => 'plain'])
            ->assertStatus(428);
        test()->withoutRequestSigning()->withHeader('api_access_token', $agent->accessToken->token)
            ->postJson($uri, ['content' => 'via token'])
            ->assertOk();
    });

    it('accepts a signed GET of the message list', function () {
        [$agent, , $uri] = dashboardAgentWithConversation();
        $grant = test()->withoutRequestSigning()->actingAs($agent)->postJson('/api/v1/request_signing_key')->assertOk()->json();

        sendSigned($grant, 'GET', $uri.'?before=999', [], '')->assertOk();
        sendSigned($grant, 'GET', $uri.'?before=999', [], '', ['signed_body' => '', 'signature' => str_repeat('a', 64)])
            ->assertStatus(400);
    });

    it('revokes previously issued keys when the user signs in again', function () {
        [$agent, , $uri] = dashboardAgentWithConversation();
        $grant = test()->withoutRequestSigning()->actingAs($agent)->postJson('/api/v1/request_signing_key')->json();

        event(new Login('web', $agent, false));

        sendSigned($grant, 'GET', $uri, [], '')->assertStatus(428)->assertJsonPath('reason', 'unknown_key');
    });
});

describe('throttling', function () {
    it('answers 429 and logs once an agent exceeds the write budget, without touching other agents', function () {
        config(['request_protection.throttle.dashboard.writes' => 2]);
        [$agent, $conversation, $uri] = dashboardAgentWithConversation();
        $colleague = User::factory()->create();
        AccountUser::factory()->create(['account_id' => $conversation->account_id, 'user_id' => $colleague->id, 'role' => AccountUser::ROLE_AGENT]);
        $conversation->inbox->addMembers([$colleague->id]);
        Log::spy();

        $this->actingAs($agent)->postJson($uri, ['content' => '1'])->assertOk();
        $this->actingAs($agent)->postJson($uri, ['content' => '2'])->assertOk();
        $this->actingAs($agent)->postJson($uri, ['content' => '3'])->assertStatus(429)->assertJsonPath('error', 'too_many_requests');
        $this->actingAs($colleague)->postJson($uri, ['content' => 'colleague'])->assertOk();

        Log::shouldHaveReceived('warning')->withArgs(fn (string $event, array $context) => $event === 'request_throttled' && $context['limiter'] === 'dashboard-message-writes');
    });

    it('throttles each widget visitor separately, never by IP', function () {
        config(['request_protection.throttle.widget.writes' => 1]);
        $session = WidgetSession::make();
        $otherVisitor = ContactInbox::factory()->create(['inbox_id' => $session->inbox->id, 'contact_id' => Contact::factory()->create(['account_id' => $session->account->id])->id]);

        $this->postJson($session->url('messages'), ['message' => ['content' => 'a']], $session->headers())->assertOk();
        $this->postJson($session->url('messages'), ['message' => ['content' => 'b']], $session->headers())->assertStatus(429);
        $this->postJson($session->url('messages'), ['message' => ['content' => 'c']], $session->headers($otherVisitor))->assertOk();
    });

    it('caps all widget writes of one inbox so a script cannot fan out over fake visitors', function () {
        config(['request_protection.throttle.widget.writes_per_inbox' => 1]);
        $session = WidgetSession::make();
        $otherVisitor = ContactInbox::factory()->create(['inbox_id' => $session->inbox->id, 'contact_id' => Contact::factory()->create(['account_id' => $session->account->id])->id]);

        $this->postJson($session->url('messages'), ['message' => ['content' => 'a']], $session->headers())->assertOk();
        $this->postJson($session->url('messages'), ['message' => ['content' => 'c']], $session->headers($otherVisitor))->assertStatus(429);
    });

    it('throttles Application API tokens on the same routes, unsigned', function () {
        config(['request_protection.throttle.application_api.writes' => 1]);
        [$agent, , $uri] = dashboardAgentWithConversation();
        $token = ['api_access_token' => $agent->accessToken->token];

        $this->withHeaders($token)->postJson($uri, ['content' => '1'])->assertOk();
        $this->withHeaders($token)->postJson($uri, ['content' => '2'])->assertStatus(429);
    });

    it('throttles the Platform API per platform app token', function () {
        config(['request_protection.throttle.platform_api.requests' => 1]);
        $token = ['api_access_token' => PlatformApp::factory()->create()->accessToken->token];
        $otherApp = ['api_access_token' => PlatformApp::factory()->create()->accessToken->token];

        $this->getJson('/platform/api/v1/agent_bots', $token)->assertOk();
        $this->getJson('/platform/api/v1/agent_bots', $token)->assertStatus(429);
        $this->getJson('/platform/api/v1/agent_bots', $otherApp)->assertOk();
    });
});
