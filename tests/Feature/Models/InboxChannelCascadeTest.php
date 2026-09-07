<?php

use App\Models\Account;
use App\Models\Channel;
use App\Models\Inbox;
use Illuminate\Support\Facades\Http;

// `belongs_to :channel, dependent: :destroy` của refs/chatwoot/app/models/inbox.rb:
// xóa inbox phải kéo theo hàng channel_*, nếu không hàng mồ côi giữ ràng buộc unique
// (email, phone_number, bot_token…) và không tạo lại inbox cùng định danh được.

/** @return array<string, array{0: string, 1: class-string, 2: list<string>}> */
function channelCascadeCases(): array
{
    return [
        'api' => ['api', Channel\Api::class, ['identifier', 'hmac_token']],
        'web widget' => ['webWidget', Channel\WebWidget::class, ['website_token', 'hmac_token']],
        'email' => ['email', Channel\Email::class, ['email', 'forward_to_email']],
        'telegram' => ['telegram', Channel\Telegram::class, ['bot_token']],
        'line' => ['line', Channel\Line::class, ['line_channel_id']],
        'sms' => ['sms', Channel\Sms::class, ['phone_number']],
        'twilio sms' => ['twilioSms', Channel\TwilioSms::class, ['account_sid', 'phone_number']],
        'whatsapp' => ['whatsapp', Channel\Whatsapp::class, ['phone_number']],
        'tiktok' => ['tiktok', Channel\Tiktok::class, ['business_id']],
        'instagram' => ['instagram', Channel\Instagram::class, ['instagram_id']],
        'facebook page' => ['facebookPage', Channel\FacebookPage::class, ['page_id']],
        'twitter profile' => ['twitterProfile', Channel\TwitterProfile::class, ['profile_id']],
        'zalo' => ['zalo', Channel\Zalo::class, ['qr_token']],
    ];
}

it('deletes the channel row with the inbox and frees its identifiers', function (string $state, string $channelClass, array $identifiers) {
    // Xoá inbox Zalo báo cho bridge đăng xuất phiên: không giả là test gõ vào
    // bridge THẬT ở 127.0.0.1:3710 (Http::preventStrayRequests bắt được).
    Http::fake([rtrim(config('zalo.bridge.url'), '/').'/*' => Http::response(['ok' => true])]);

    $account = Account::factory()->create();
    $inbox = $state === 'api'
        ? Inbox::factory()->create(['account_id' => $account->id])
        : Inbox::factory()->{$state}()->create(['account_id' => $account->id]);

    $channel = $inbox->channel;
    $identity = collect($identifiers)->mapWithKeys(fn (string $column) => [$column => $channel->{$column}])->all();

    $inbox->delete();

    expect($channelClass::whereKey($channel->id)->exists())->toBeFalse();

    // Định danh được giải phóng: tạo lại kênh cùng giá trị không vướng unique.
    $recreated = $channelClass::factory()->create(['account_id' => $account->id] + $identity);
    expect($recreated->exists)->toBeTrue();
})->with(channelCascadeCases());

it('deletes channel rows when the whole account goes away', function () {
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->email()->create(['account_id' => $account->id]);
    $email = $inbox->channel->email;

    $account->delete();

    expect(Channel\Email::where('email', $email)->exists())->toBeFalse();
});

it('removes the channel row before the inbox row', function () {
    $inbox = Inbox::factory()->email()->create();
    $channelId = $inbox->channel_id;
    $observed = [];

    Inbox::deleting(function (Inbox $deleting) use (&$observed, $channelId) {
        $observed = [
            'inbox' => Inbox::whereKey($deleting->id)->exists(),
            'channel' => Channel\Email::whereKey($channelId)->exists(),
        ];
    });

    $inbox->delete();

    expect($observed)->toBe(['inbox' => true, 'channel' => false]);
});

it('lists only not-null string columns with a default as blankable', function () {
    $blankable = (fn () => static::blankableStringColumns())->call(new Channel\Email);

    expect($blankable)->toContain('imap_address', 'imap_login', 'smtp_address', 'smtp_login', 'smtp_domain')
        ->not->toContain('email', 'imap_password', 'imap_port', 'imap_enabled');
});
