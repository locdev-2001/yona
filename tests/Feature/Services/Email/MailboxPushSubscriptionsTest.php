<?php

use App\Jobs\Inboxes\RenewMailboxPushSubscriptionsJob;
use App\Models\Account;
use App\Models\Channel\Email;
use App\Models\Inbox;
use App\Services\Email\Push\MailboxPushSubscriptions;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    config(['services.google_mail.pubsub_topic' => 'projects/yona-511104/topics/gmail-inbox']);
    $this->account = Account::factory()->create();
});

function gmailChannel(Account $account, array $attributes = []): Email
{
    $channel = Email::factory()->create([
        'account_id' => $account->id,
        'email' => 'shop@gmail.com',
        'provider' => 'google',
        'imap_enabled' => true,
        'imap_address' => 'imap.gmail.com',
        'provider_config' => ['access_token' => 'access-1', 'refresh_token' => 'refresh-1', 'expires_at' => now()->addHour()->toIso8601String()],
        ...$attributes,
    ]);
    Inbox::factory()->create(['account_id' => $account->id, 'channel_id' => $channel->id, 'channel_type' => 'Channel::Email']);

    return $channel;
}

function fakeGmailWatch(): void
{
    Http::fake(['gmail.googleapis.com/gmail/v1/users/me/watch' => Http::response([
        'historyId' => '987654',
        'expiration' => (string) now()->addDays(7)->getTimestampMs(),
    ])]);
}

it('đăng ký Gmail watch vào đúng topic, nhãn INBOX, lưu hạn và historyId', function () {
    fakeGmailWatch();
    $channel = gmailChannel($this->account);

    expect(app(MailboxPushSubscriptions::class)->subscribe($channel))->toBeTrue();

    Http::assertSent(fn (HttpRequest $request) => $request->url() === 'https://gmail.googleapis.com/gmail/v1/users/me/watch'
        && $request->hasHeader('Authorization', 'Bearer access-1')
        && $request['topicName'] === 'projects/yona-511104/topics/gmail-inbox'
        && $request['labelIds'] === ['INBOX']
        && $request['labelFilterBehavior'] === 'include');

    $push = $channel->fresh()->provider_config['push'];

    expect($push['cursor'])->toBe('987654')
        ->and(now()->addDays(7)->diffInMinutes($push['expires_at'], true))->toBeLessThan(1.0)
        ->and($channel->fresh()->provider_config['refresh_token'])->toBe('refresh-1');
});

it('thiếu topic, hộp không phải Google hoặc cần kết nối lại thì không đăng ký', function () {
    Http::fake();

    $outlook = gmailChannel($this->account, ['email' => 'shop@outlook.com', 'provider' => 'microsoft']);
    expect(app(MailboxPushSubscriptions::class)->subscribe($outlook))->toBeFalse();

    $gmail = gmailChannel($this->account);
    $gmail->promptReauthorization();
    expect(app(MailboxPushSubscriptions::class)->subscribe($gmail))->toBeFalse();
    $gmail->reauthorized();

    config(['services.google_mail.pubsub_topic' => null]);
    expect(app(MailboxPushSubscriptions::class)->subscribe($gmail))->toBeFalse();

    Http::assertNothingSent();
});

it('Gmail từ chối watch thì báo false, hộp thư giữ nguyên', function () {
    Http::fake(['gmail.googleapis.com/*' => Http::response(['error' => ['code' => 403]], 403)]);
    $channel = gmailChannel($this->account);

    expect(app(MailboxPushSubscriptions::class)->subscribe($channel))->toBeFalse()
        ->and($channel->fresh()->provider_config)->not->toHaveKey('push');
});

it('job hằng ngày chỉ gia hạn hộp còn dưới 2 ngày hoặc chưa đăng ký', function () {
    fakeGmailWatch();
    $fresh = gmailChannel($this->account, ['email' => 'con-han@gmail.com']);
    $fresh->forceFill(['provider_config' => [...$fresh->provider_config, 'push' => ['expires_at' => now()->addDays(5)->toIso8601String()]]])->save();
    $expiring = gmailChannel($this->account, ['email' => 'sap-het@gmail.com']);
    $expiring->forceFill(['provider_config' => [...$expiring->provider_config, 'push' => ['expires_at' => now()->addDay()->toIso8601String()]]])->save();
    $never = gmailChannel($this->account, ['email' => 'chua-dang-ky@gmail.com']);

    app()->call([new RenewMailboxPushSubscriptionsJob, 'handle']);

    Http::assertSentCount(2);
    expect(now()->diffInDays($expiring->fresh()->provider_config['push']['expires_at']))->toBeGreaterThan(6.0)
        ->and($never->fresh()->provider_config)->toHaveKey('push')
        ->and(now()->diffInDays($fresh->fresh()->provider_config['push']['expires_at']))->toBeLessThan(6.0);
});
