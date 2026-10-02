<?php

use App\Http\Resources\MessageResource;
use App\Models\Account;
use App\Models\Channel\Email;
use App\Models\Inbox;
use App\Models\Message;

// Port từ spec/models/channel/email_spec.rb (+ phần Reauthorizable dùng chung).

it('has a valid name', function () {
    expect(Email::factory()->create()->name())->toBe('Email');
});

it('detects the microsoft provider', function () {
    $channel = Email::factory()->create();

    expect($channel->isMicrosoft())->toBeFalse();

    $channel->provider = 'microsoft';

    expect($channel->isMicrosoft())->toBeTrue();
});

it('detects the google provider', function () {
    $channel = Email::factory()->create();

    expect($channel->isGoogle())->toBeFalse();

    $channel->provider = 'google';

    expect($channel->isGoogle())->toBeTrue();
});

it('detects a legacy google channel from the imap address', function () {
    $channel = Email::factory()->create(['imap_enabled' => true, 'imap_address' => 'imap.gmail.com']);

    expect($channel->isLegacyGoogle())->toBeTrue()
        ->and(Email::factory()->create()->isLegacyGoogle())->toBeFalse();
});

it('generates a forward to email inside the inbound email domain', function () {
    config(['mail.inbound_email_domain' => 'inbound.yona.vn']);

    $channel = Email::factory()->create();

    expect($channel->forward_to_email)->toEndWith('@inbound.yona.vn')
        ->and(explode('@', $channel->forward_to_email)[0])->toHaveLength(32);
});

it('prefers the account domain over the configured inbound domain', function () {
    config(['mail.inbound_email_domain' => 'inbound.yona.vn']);
    $account = Account::factory()->create(['domain' => 'acme.test']);

    expect(Email::factory()->create(['account_id' => $account->id])->forward_to_email)->toEndWith('@acme.test');
});

it('keeps a forward to email supplied by the caller', function () {
    $channel = Email::factory()->create(['forward_to_email' => 'fixed@inbound.test']);

    expect($channel->forward_to_email)->toBe('fixed@inbound.test');
});

it('stores imap and smtp passwords encrypted at rest', function () {
    $channel = Email::factory()->create(['imap_password' => 'secret-imap', 'smtp_password' => 'secret-smtp']);

    $raw = DB::table('channel_email')->where('id', $channel->id)->first();

    expect($raw->imap_password)->not->toBe('secret-imap')
        ->and($raw->smtp_password)->not->toBe('secret-smtp')
        ->and($channel->fresh()->imap_password)->toBe('secret-imap')
        ->and($channel->fresh()->smtp_password)->toBe('secret-smtp');
});

it('flags reauthorization once the error threshold is crossed', function () {
    $channel = Email::factory()->create();

    foreach (range(1, Email::AUTHORIZATION_ERROR_THRESHOLD - 1) as $ignored) {
        $channel->authorizationError();
    }

    expect($channel->reauthorizationRequired())->toBeFalse();

    $channel->authorizationError();

    expect($channel->reauthorizationRequired())->toBeTrue();

    $channel->reauthorized();

    expect($channel->reauthorizationRequired())->toBeFalse()
        ->and($channel->authorizationErrorCount())->toBe(0);
});

it('exposes the channel through its inbox', function () {
    $inbox = Inbox::factory()->email()->create();

    expect($inbox->isEmail())->toBeTrue()
        ->and($inbox->inboxType())->toBe('Email')
        ->and($inbox->channel)->toBeInstanceOf(Email::class)
        ->and($inbox->channel->inbox->id)->toBe($inbox->id);
});

it('links a gmail message to the same mail in gmail web, signed in as the inbox address', function (array $attributes) {
    $channel = Email::factory()->make(['email' => 'shop@gmail.com', ...$attributes]);

    expect($channel->sourceMessageUrl(new Message(['source_id' => 'abc+1@mail.gmail.com'])))
        ->toBe('https://mail.google.com/mail/?authuser=shop%40gmail.com#search/rfc822msgid%3Aabc%2B1%40mail.gmail.com');
})->with([
    'oauth' => [['provider' => 'google']],
    'app password' => [['imap_enabled' => true, 'imap_address' => 'imap.gmail.com']],
]);

it('has no source link outside gmail or before the mail has a message id', function (array $attributes, ?string $sourceId) {
    $channel = Email::factory()->make($attributes);

    expect($channel->sourceMessageUrl(new Message(['source_id' => $sourceId])))->toBeNull();
})->with([
    'other mail server' => [['imap_enabled' => true, 'imap_address' => 'imap.zoho.com'], 'id@example.com'],
    'outlook' => [['provider' => 'microsoft'], 'id@example.com'],
    'no message id yet' => [['provider' => 'google'], null],
]);

it('serializes the gmail link of an email message for the dashboard', function () {
    $account = Account::factory()->create();
    $channel = Email::factory()->create(['account_id' => $account->id, 'email' => 'shop@gmail.com', 'provider' => 'google']);
    $inbox = Inbox::factory()->create(['account_id' => $account->id, 'channel_id' => $channel->id, 'channel_type' => 'Channel::Email']);
    $message = Message::factory()->create(['account_id' => $account->id, 'inbox_id' => $inbox->id, 'source_id' => 'id@mail.gmail.com']);
    $plainMessage = Message::factory()->create(['account_id' => $account->id]);

    [$payload, $plainPayload] = MessageResource::collectionFor([$message, $plainMessage]);

    expect($payload['source_link'])->toBe([
        'url' => $channel->sourceMessageUrl($message),
        'platform' => 'Gmail',
    ])->and($plainPayload)->not->toHaveKey('source_link')
        ->and(MessageResource::pushEventData($message->fresh())['source_link']['platform'])->toBe('Gmail');
});
