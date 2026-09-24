<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\User;

// Test khung Current context (SetCurrentAccount) + web_api availability —
// tương đương hành vi scoping account (Current.account).

describe('account scoping', function () {
    it('returns 404 for accounts the user is not a member of', function () {
        $user = User::factory()->create();
        $otherAccount = Account::factory()->create();

        $this->actingAs($user)->get("/app/accounts/{$otherAccount->id}/dashboard")->assertNotFound();
    });

    it('shares current account and memberships with the page', function () {
        $user = User::factory()->create();
        $account = Account::factory()->create();
        AccountUser::factory()->administrator()->create(['account_id' => $account->id, 'user_id' => $user->id]);

        $this->actingAs($user)->get("/app/accounts/{$account->id}/dashboard")
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/conversation/ConversationView')
                ->where('currentAccount.id', $account->id)
                ->where('currentAccountUser.role', 'administrator')
                ->has('userAccounts', 1));
    });

    it('renders the conversation view with the mention type for the mentions routes', function () {
        $user = User::factory()->create();
        $account = Account::factory()->create();
        AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id]);

        $this->actingAs($user)->get("/app/accounts/{$account->id}/mentions/conversations")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/conversation/ConversationView')
                ->where('conversationType', 'mention')
                ->missing('conversationId'));

        $this->actingAs($user)->get("/app/accounts/{$account->id}/mentions/conversations/7")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/conversation/ConversationView')
                ->where('conversationType', 'mention')
                ->where('conversationId', 7));
    });

    it('renders placeholder pages for unported child routes', function () {
        $user = User::factory()->create();
        $account = Account::factory()->create();
        AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id]);

        $this->actingAs($user)->get("/app/accounts/{$account->id}/settings/sla")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/PlaceholderView')
                ->where('view', 'settings/sla'));
    });
});

describe('web_api profile availability', function () {
    it('updates availability for the current account membership', function () {
        $user = User::factory()->create();
        $account = Account::factory()->create();
        $accountUser = AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id]);

        $this->actingAs($user)
            ->postJson("/api/v1/accounts/{$account->id}/profile/availability", ['availability' => 'busy'])
            ->assertOk()
            ->assertJson(['availability' => 'busy']);

        expect($accountUser->refresh()->availability)->toBe(AccountUser::AVAILABILITY_BUSY);
    });

    it('updates auto offline', function () {
        $user = User::factory()->create();
        $account = Account::factory()->create();
        $accountUser = AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id]);

        $this->actingAs($user)
            ->postJson("/api/v1/accounts/{$account->id}/profile/auto_offline", ['auto_offline' => false])
            ->assertOk();

        expect($accountUser->refresh()->auto_offline)->toBeFalse();
    });

    it('rejects non-members', function () {
        $user = User::factory()->create();
        $otherAccount = Account::factory()->create();

        $this->actingAs($user)
            ->postJson("/api/v1/accounts/{$otherAccount->id}/profile/availability", ['availability' => 'busy'])
            ->assertNotFound();
    });
});
