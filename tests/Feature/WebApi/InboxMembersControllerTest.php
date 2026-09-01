<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Inbox;
use App\Models\User;

// Port từ spec/controllers/api/v1/accounts/inbox_members_controller_spec.rb.

function inboxMembersUser(Account $account, int $role = AccountUser::ROLE_AGENT): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create([
        'account_id' => $account->id,
        'user_id' => $user->id,
        'role' => $role,
    ]);

    return $user;
}

function inboxMembersInbox(Account $account): Inbox
{
    return Inbox::factory()->create(['account_id' => $account->id]);
}

describe('GET /api/v1/accounts/{id}/inbox_members/{inboxId}', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = Account::factory()->create();
        $inbox = inboxMembersInbox($account);

        $this->getJson("/api/v1/accounts/{$account->id}/inbox_members/{$inbox->id}")
            ->assertUnauthorized();
    });

    it('returns unauthorized for an agent without access to the inbox', function () {
        $account = Account::factory()->create();
        $agent = inboxMembersUser($account);
        $inbox = inboxMembersInbox($account);

        $this->actingAs($agent)
            ->getJson("/api/v1/accounts/{$account->id}/inbox_members/{$inbox->id}")
            ->assertUnauthorized();
    });

    it('returns inbox members for an agent with access', function () {
        $account = Account::factory()->create();
        $agent = inboxMembersUser($account);
        $inbox = inboxMembersInbox($account);
        $inbox->addMembers([$agent->id]);

        $response = $this->actingAs($agent)
            ->getJson("/api/v1/accounts/{$account->id}/inbox_members/{$inbox->id}")
            ->assertOk();

        expect(collect($response->json('payload'))->pluck('id')->all())->toBe([$agent->id]);
    });
});

describe('POST /api/v1/accounts/{id}/inbox_members', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = Account::factory()->create();

        $this->postJson("/api/v1/accounts/{$account->id}/inbox_members")->assertUnauthorized();
    });

    it('returns unauthorized for agent', function () {
        $account = Account::factory()->create();
        $agent = inboxMembersUser($account);
        $inbox = inboxMembersInbox($account);
        $inbox->addMembers([$agent->id]);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/inbox_members", [
                'inbox_id' => $inbox->id,
                'user_ids' => [$agent->id],
            ])
            ->assertUnauthorized();
    });

    it('adds inbox members without duplicating existing ones', function () {
        $account = Account::factory()->create();
        $admin = inboxMembersUser($account, AccountUser::ROLE_ADMINISTRATOR);
        $oldAgent = inboxMembersUser($account);
        $agentToAdd = inboxMembersUser($account);
        $inbox = inboxMembersInbox($account);
        $inbox->addMembers([$oldAgent->id]);

        $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/inbox_members", [
                'inbox_id' => $inbox->id,
                'user_ids' => [$oldAgent->id, $agentToAdd->id],
            ])
            ->assertOk();

        expect($inbox->inboxMembers()->count())->toBe(2)
            ->and($inbox->inboxMembers()->pluck('user_id')->all())
            ->toContain($oldAgent->id, $agentToAdd->id);
    });

    it('renders not found when inbox not found', function () {
        $account = Account::factory()->create();
        $admin = inboxMembersUser($account, AccountUser::ROLE_ADMINISTRATOR);
        $agent = inboxMembersUser($account);

        $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/inbox_members", [
                'inbox_id' => null,
                'user_ids' => [$agent->id],
            ])
            ->assertNotFound();
    });

    it('renders error on invalid user ids', function () {
        $account = Account::factory()->create();
        $admin = inboxMembersUser($account, AccountUser::ROLE_ADMINISTRATOR);
        $inbox = inboxMembersInbox($account);

        $response = $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/inbox_members", [
                'inbox_id' => $inbox->id,
                'user_ids' => ['invalid'],
            ])
            ->assertUnprocessable();

        expect($response->getContent())->toContain('User must exist');
    });

    it('rejects users from another account', function () {
        $account = Account::factory()->create();
        $admin = inboxMembersUser($account, AccountUser::ROLE_ADMINISTRATOR);
        $inbox = inboxMembersInbox($account);
        $outsider = inboxMembersUser(Account::factory()->create());

        $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/inbox_members", [
                'inbox_id' => $inbox->id,
                'user_ids' => [$outsider->id],
            ])
            ->assertUnprocessable();
    });
});

describe('PATCH /api/v1/accounts/{id}/inbox_members', function () {
    it('returns unauthorized for agent', function () {
        $account = Account::factory()->create();
        $agent = inboxMembersUser($account);
        $inbox = inboxMembersInbox($account);
        $inbox->addMembers([$agent->id]);

        $this->actingAs($agent)
            ->patchJson("/api/v1/accounts/{$account->id}/inbox_members", [
                'inbox_id' => $inbox->id,
                'user_ids' => [$agent->id],
            ])
            ->assertUnauthorized();
    });

    it('replaces inbox members with the given list', function () {
        $account = Account::factory()->create();
        $admin = inboxMembersUser($account, AccountUser::ROLE_ADMINISTRATOR);
        $oldAgent = inboxMembersUser($account);
        $agentToAdd = inboxMembersUser($account);
        $inbox = inboxMembersInbox($account);
        $inbox->addMembers([$oldAgent->id]);

        $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}/inbox_members", [
                'inbox_id' => $inbox->id,
                'user_ids' => [$agentToAdd->id],
            ])
            ->assertOk();

        expect($inbox->inboxMembers()->pluck('user_id')->all())->toBe([$agentToAdd->id]);
    });

    it('renders not found when inbox not found', function () {
        $account = Account::factory()->create();
        $admin = inboxMembersUser($account, AccountUser::ROLE_ADMINISTRATOR);
        $agent = inboxMembersUser($account);

        $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}/inbox_members", [
                'inbox_id' => null,
                'user_ids' => [$agent->id],
            ])
            ->assertNotFound();
    });

    it('renders error on invalid user ids', function () {
        $account = Account::factory()->create();
        $admin = inboxMembersUser($account, AccountUser::ROLE_ADMINISTRATOR);
        $inbox = inboxMembersInbox($account);

        $response = $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}/inbox_members", [
                'inbox_id' => $inbox->id,
                'user_ids' => ['invalid'],
            ])
            ->assertUnprocessable();

        expect($response->getContent())->toContain('User must exist');
    });
});

describe('DELETE /api/v1/accounts/{id}/inbox_members', function () {
    it('returns unauthorized for agent', function () {
        $account = Account::factory()->create();
        $agent = inboxMembersUser($account);
        $inbox = inboxMembersInbox($account);
        $inbox->addMembers([$agent->id]);

        $this->actingAs($agent)
            ->deleteJson("/api/v1/accounts/{$account->id}/inbox_members", [
                'inbox_id' => $inbox->id,
                'user_ids' => [$agent->id],
            ])
            ->assertUnauthorized();
    });

    it('deletes inbox members', function () {
        $account = Account::factory()->create();
        $admin = inboxMembersUser($account, AccountUser::ROLE_ADMINISTRATOR);
        $oldAgent = inboxMembersUser($account);
        $agentToDelete = inboxMembersUser($account);
        $inbox = inboxMembersInbox($account);
        $inbox->addMembers([$oldAgent->id, $agentToDelete->id]);

        $this->actingAs($admin)
            ->deleteJson("/api/v1/accounts/{$account->id}/inbox_members", [
                'inbox_id' => $inbox->id,
                'user_ids' => [$agentToDelete->id],
            ])
            ->assertOk();

        expect($inbox->inboxMembers()->pluck('user_id')->all())->toBe([$oldAgent->id]);
    });

    it('renders not found when inbox not found', function () {
        $account = Account::factory()->create();
        $admin = inboxMembersUser($account, AccountUser::ROLE_ADMINISTRATOR);
        $agent = inboxMembersUser($account);

        $this->actingAs($admin)
            ->deleteJson("/api/v1/accounts/{$account->id}/inbox_members", [
                'inbox_id' => null,
                'user_ids' => [$agent->id],
            ])
            ->assertNotFound();
    });

    it('ignores invalid user ids', function () {
        $account = Account::factory()->create();
        $admin = inboxMembersUser($account, AccountUser::ROLE_ADMINISTRATOR);
        $oldAgent = inboxMembersUser($account);
        $inbox = inboxMembersInbox($account);
        $inbox->addMembers([$oldAgent->id]);

        $this->actingAs($admin)
            ->deleteJson("/api/v1/accounts/{$account->id}/inbox_members", [
                'inbox_id' => $inbox->id,
                'user_ids' => ['invalid'],
            ])
            ->assertOk();

        expect($inbox->inboxMembers()->count())->toBe(1);
    });

    it('ignores non member user ids', function () {
        $account = Account::factory()->create();
        $admin = inboxMembersUser($account, AccountUser::ROLE_ADMINISTRATOR);
        $oldAgent = inboxMembersUser($account);
        $nonMember = inboxMembersUser($account);
        $inbox = inboxMembersInbox($account);
        $inbox->addMembers([$oldAgent->id]);

        $this->actingAs($admin)
            ->deleteJson("/api/v1/accounts/{$account->id}/inbox_members", [
                'inbox_id' => $inbox->id,
                'user_ids' => [$nonMember->id],
            ])
            ->assertOk();

        expect($inbox->inboxMembers()->count())->toBe(1);
    });
});
