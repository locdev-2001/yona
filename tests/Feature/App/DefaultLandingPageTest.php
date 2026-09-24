<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\User;

// Vào hệ thống là thấy màn Hội thoại: mọi đường vào (đăng nhập, gõ /app, gõ
// /app/accounts/{id}, route ngoài quyền) đều dẫn về dashboard của account, và
// dashboard là danh sách hội thoại. Trang thông báo đầy đủ vẫn giữ route riêng.

const DEFAULT_LANDING_COMPONENT = 'dashboard/conversation/ConversationView';

function signedInMemberOf(Account $account, bool $administrator = false): User
{
    $user = User::factory()->create();
    $factory = AccountUser::factory();
    ($administrator ? $factory->administrator() : $factory)->create(['account_id' => $account->id, 'user_id' => $user->id]);

    return $user;
}

beforeEach(function () {
    $this->account = Account::factory()->create();
});

it('sends the bare account path to the conversation dashboard', function () {
    $this->actingAs(signedInMemberOf($this->account))
        ->get("/app/accounts/{$this->account->id}")
        ->assertRedirect("/app/accounts/{$this->account->id}/dashboard");
});

it('opens the conversation screen as the dashboard', function (bool $administrator) {
    $this->actingAs(signedInMemberOf($this->account, $administrator))
        ->get("/app/accounts/{$this->account->id}/dashboard")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component(DEFAULT_LANDING_COMPONENT));
})->with(['agent' => false, 'administrator' => true]);

it('sends a signed-in user from /app straight to the conversation screen', function () {
    $this->actingAs(signedInMemberOf($this->account))
        ->followingRedirects()
        ->get('/app')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component(DEFAULT_LANDING_COMPONENT));
});

it('brings an agent back to the conversation screen from an admin-only page', function () {
    $this->actingAs(signedInMemberOf($this->account))
        ->followingRedirects()
        ->get("/app/accounts/{$this->account->id}/settings/agents/list")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component(DEFAULT_LANDING_COMPONENT));
});

it('keeps the full notifications page reachable by its own route', function () {
    $this->actingAs(signedInMemberOf($this->account))
        ->get("/app/accounts/{$this->account->id}/inbox-view")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('dashboard/notifications/InboxList'));
});
