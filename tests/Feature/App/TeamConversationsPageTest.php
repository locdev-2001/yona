<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Team;
use App\Models\User;

// Sidebar nhóm Teams (teams/getMyTeams) + route team_conversations /
// conversations_through_team của conversation.routes.js.
describe('team conversations page', function () {
    it('shares only teams the user is a member of, sorted by name', function () {
        $user = User::factory()->create();
        $account = Account::factory()->create();
        AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id]);

        $support = Team::factory()->create(['account_id' => $account->id, 'name' => 'support']);
        $billing = Team::factory()->create(['account_id' => $account->id, 'name' => 'billing']);
        Team::factory()->create(['account_id' => $account->id, 'name' => 'not-mine']);
        $support->addMembers([$user->id]);
        $billing->addMembers([$user->id]);

        $otherAccount = Account::factory()->create();
        AccountUser::factory()->create(['account_id' => $otherAccount->id, 'user_id' => $user->id]);
        Team::factory()->create(['account_id' => $otherAccount->id, 'name' => 'Alpha'])->addMembers([$user->id]);

        $this->actingAs($user)->get("/app/accounts/{$account->id}/dashboard")
            ->assertInertia(fn ($page) => $page
                ->has('teams', 2)
                ->where('teams.0', ['id' => $billing->id, 'name' => 'billing'])
                ->where('teams.1', ['id' => $support->id, 'name' => 'support']));
    });

    it('renders the conversation view scoped to a team', function () {
        $user = User::factory()->create();
        $account = Account::factory()->create();
        AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id]);
        $team = Team::factory()->create(['account_id' => $account->id]);

        $this->actingAs($user)->get("/app/accounts/{$account->id}/team/{$team->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/conversation/ConversationView')
                ->where('teamId', $team->id)
                ->where('conversationId', null));

        $this->actingAs($user)->get("/app/accounts/{$account->id}/team/{$team->id}/conversations/7")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/conversation/ConversationView')
                ->where('teamId', $team->id)
                ->where('conversationId', 7));
    });
});
