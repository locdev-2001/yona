<?php

use App\Models\Account;
use App\Models\Channel\Email;
use App\Models\Inbox;

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
