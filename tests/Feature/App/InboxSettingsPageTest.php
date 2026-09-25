<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Inbox;
use App\Models\User;

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

it('shows the mailbox address as the sender of an email inbox', function () {
    $account = Account::factory()->create(['support_email' => 'hotro@shophoamai.vn']);
    $inbox = Inbox::factory()->email()->create(['account_id' => $account->id]);

    $this->actingAs(inboxSettingsAdmin($account))
        ->get("/app/accounts/{$account->id}/settings/inboxes/{$inbox->id}")
        ->assertInertia(fn ($page) => $page->where('senderEmailAddress', $inbox->channel->email));
});

it('returns not found for an inbox of another account', function () {
    $account = Account::factory()->create();
    $otherInbox = Inbox::factory()->webWidget()->create();

    $this->actingAs(inboxSettingsAdmin($account))
        ->get("/app/accounts/{$account->id}/settings/inboxes/{$otherInbox->id}")
        ->assertNotFound();
});
