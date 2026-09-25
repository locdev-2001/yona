<?php

use App\Builders\Messages\MessageBuilder;
use App\Mail\ConversationReplyMail;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Channel\Email;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\User;
use App\Support\Timezones;

function inboxSettingsAdmin(Account $account): User
{
    $admin = User::factory()->create();
    AccountUser::factory()->administrator()->create(['account_id' => $account->id, 'user_id' => $admin->id]);

    return $admin;
}

it('shows the account support address as the sender of website follow-up emails', function () {
    $account = Account::factory()->create(['support_email' => 'hotro@shophoamai.vn']);
    $inbox = Inbox::factory()->webWidget()->create(['account_id' => $account->id]);

    $this->actingAs(inboxSettingsAdmin($account))
        ->get("/app/accounts/{$account->id}/settings/inboxes/{$inbox->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard/settings/inboxes/Show')
            ->where('inboxId', $inbox->id)
            ->where('senderEmailAddress', 'hotro@shophoamai.vn'));
});

it('falls back to the installation sender address when the account has no support email', function () {
    config(['mail.sender_email' => 'Yona <noreply@yona.vn>']);
    $account = Account::factory()->create(['support_email' => null]);
    $inbox = Inbox::factory()->webWidget()->create(['account_id' => $account->id]);

    $this->actingAs(inboxSettingsAdmin($account))
        ->get("/app/accounts/{$account->id}/settings/inboxes/{$inbox->id}")
        ->assertInertia(fn ($page) => $page->where('senderEmailAddress', 'noreply@yona.vn'));
});

// Hộp thư email gửi bằng địa chỉ riêng khi có máy chủ gửi của mình (SMTP, đăng nhập Google/Microsoft);
// còn lại thư đi qua máy chủ của Yona bằng địa chỉ của account.
dataset('email inbox sending setups', [
    'own IMAP and SMTP' => [['imap_enabled' => true, 'smtp_enabled' => true], 'lienhe@shophoamai.vn'],
    'own SMTP only' => [['imap_enabled' => false, 'smtp_enabled' => true], 'lienhe@shophoamai.vn'],
    'Google sign in' => [['provider' => 'google', 'imap_enabled' => true], 'lienhe@shophoamai.vn'],
    'IMAP only' => [['imap_enabled' => true, 'smtp_enabled' => false], 'hotro@shophoamai.vn'],
    'mail forwarding' => [['imap_enabled' => false, 'smtp_enabled' => false], 'hotro@shophoamai.vn'],
]);

it('shows the address that email inbox replies are really sent from', function (array $channelAttributes, string $expectedSender, bool $replyMailerMigration) {
    config(['mail.smtp_address' => 'smtp.yona.test']);
    $account = Account::factory()->create([
        'support_email' => 'Shop Hoa Mai <hotro@shophoamai.vn>',
        'feature_flags' => ['reply_mailer_migration' => $replyMailerMigration],
    ]);
    $channel = Email::factory()->create(['account_id' => $account->id, 'email' => 'lienhe@shophoamai.vn', ...$channelAttributes]);
    $inbox = Inbox::factory()->create(['account_id' => $account->id, 'channel_id' => $channel->id, 'channel_type' => 'Channel::Email']);
    $conversation = Conversation::factory()->create(['account_id' => $account->id, 'inbox_id' => $inbox->id]);
    $conversation->contact->update(['email' => 'khach@example.com']);
    $reply = (new MessageBuilder(User::factory()->create(), $conversation, ['content' => 'Chào chị']))->perform();

    $this->actingAs(inboxSettingsAdmin($account))
        ->get("/app/accounts/{$account->id}/settings/inboxes/{$inbox->id}")
        ->assertInertia(fn ($page) => $page->where('senderEmailAddress', $expectedSender));

    expect(ConversationReplyMail::emailReply($reply->fresh())->envelope()->from->address)->toBe($expectedSender);
})->with('email inbox sending setups')->with(['current reply mailer' => false, 'migrated reply mailer' => true]);

it('offers the timezones that the inbox api accepts', function () {
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->webWidget()->create(['account_id' => $account->id]);

    $this->actingAs(inboxSettingsAdmin($account))
        ->get("/app/accounts/{$account->id}/settings/inboxes/{$inbox->id}")
        ->assertInertia(fn ($page) => $page->where('timezoneOptions', Timezones::options()));

    expect(Timezones::options())->toContain(['label' => 'UTC (UTC+00:00)', 'value' => 'UTC']);
});

it('returns not found for an inbox of another account', function () {
    $account = Account::factory()->create();
    $otherInbox = Inbox::factory()->webWidget()->create();

    $this->actingAs(inboxSettingsAdmin($account))
        ->get("/app/accounts/{$account->id}/settings/inboxes/{$otherInbox->id}")
        ->assertNotFound();
});
