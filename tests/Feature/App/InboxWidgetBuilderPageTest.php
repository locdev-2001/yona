<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Inbox;
use App\Models\User;

function widgetBuilderAdmin(Account $account): User
{
    $admin = User::factory()->create();
    AccountUser::factory()->administrator()->create(['account_id' => $account->id, 'user_id' => $admin->id]);

    return $admin;
}

function widgetBuilderAgent(Account $account): User
{
    $agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $agent->id, 'role' => AccountUser::ROLE_AGENT]);

    return $agent;
}

it('renders the widget builder page for a website inbox', function () {
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->webWidget()->create(['account_id' => $account->id]);

    $this->actingAs(widgetBuilderAdmin($account))
        ->get("/app/accounts/{$account->id}/settings/inboxes/{$inbox->id}/widget")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard/settings/inboxes/widget-builder/WidgetBuilderPage')
            ->where('inboxId', $inbox->id));
});

it('refuses agents — chỉ quản trị viên được sửa cấu hình widget', function () {
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->webWidget()->create(['account_id' => $account->id]);
    $agent = widgetBuilderAgent($account);

    $this->actingAs($agent)
        ->get("/app/accounts/{$account->id}/settings/inboxes/{$inbox->id}/widget")
        ->assertRedirect("/app/accounts/{$account->id}/dashboard");
});

it('trả 404 cho hộp thư không phải kênh website', function () {
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->create(['account_id' => $account->id, 'channel_type' => 'Channel::Api']);

    $this->actingAs(widgetBuilderAdmin($account))
        ->get("/app/accounts/{$account->id}/settings/inboxes/{$inbox->id}/widget")
        ->assertNotFound();
});

it('trả 404 cho hộp thư của account khác', function () {
    $account = Account::factory()->create();
    $otherInbox = Inbox::factory()->webWidget()->create();

    $this->actingAs(widgetBuilderAdmin($account))
        ->get("/app/accounts/{$account->id}/settings/inboxes/{$otherInbox->id}/widget")
        ->assertNotFound();
});
