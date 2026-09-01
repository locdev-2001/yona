<?php

use App\Jobs\DeleteObjectJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Channel\Api;
use App\Models\Inbox;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

// Port từ spec/controllers/api/v1/accounts/inboxes_controller_spec.rb
// (các block cho kênh API; kênh khác port cùng tính năng của chúng).

function inboxMemberOf(Account $account, int $role = AccountUser::ROLE_AGENT): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create([
        'account_id' => $account->id,
        'user_id' => $user->id,
        'role' => $role,
    ]);

    return $user;
}

function apiInboxFor(Account $account): Inbox
{
    return Inbox::factory()->create(['account_id' => $account->id]);
}

describe('GET /api/v1/accounts/{id}/inboxes', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = Account::factory()->create();

        $this->getJson("/api/v1/accounts/{$account->id}/inboxes")->assertUnauthorized();
    });

    it('returns all inboxes of the account as administrator', function () {
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        apiInboxFor($account);
        apiInboxFor($account);

        $response = $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/inboxes")
            ->assertOk();

        expect($response->json('payload'))->toHaveCount(2);
    });

    it('returns only assigned inboxes as agent', function () {
        $account = Account::factory()->create();
        $agent = inboxMemberOf($account);
        $assigned = apiInboxFor($account);
        apiInboxFor($account);
        $assigned->addMembers([$agent->id]);

        $response = $this->actingAs($agent)
            ->getJson("/api/v1/accounts/{$account->id}/inboxes")
            ->assertOk();

        expect($response->json('payload'))->toHaveCount(1)
            ->and($response->json('payload.0.id'))->toBe($assigned->id);
    });

    it('hides hmac_token and secret from agents', function () {
        $account = Account::factory()->create();
        $agent = inboxMemberOf($account);
        $inbox = apiInboxFor($account);
        $inbox->addMembers([$agent->id]);

        $response = $this->actingAs($agent)
            ->getJson("/api/v1/accounts/{$account->id}/inboxes")
            ->assertOk();

        expect($response->json('payload.0'))->not->toHaveKey('hmac_token')
            ->and($response->json('payload.0'))->not->toHaveKey('secret')
            ->and($response->json('payload.0.inbox_identifier'))->not->toBeNull();
    });
});

describe('GET /api/v1/accounts/{id}/inboxes/{inboxId}', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = Account::factory()->create();
        $inbox = apiInboxFor($account);

        $this->getJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}")->assertUnauthorized();
    });

    it('returns unauthorized for an agent who is not assigned', function () {
        $account = Account::factory()->create();
        $agent = inboxMemberOf($account);
        $inbox = apiInboxFor($account);

        $this->actingAs($agent)
            ->getJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}")
            ->assertUnauthorized();
    });

    it('returns the inbox if administrator', function () {
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $inbox = apiInboxFor($account);

        $response = $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}")
            ->assertOk();

        expect($response->json('id'))->toBe($inbox->id)
            ->and($response->json('channel_type'))->toBe('Channel::Api')
            ->and($response->json('hmac_token'))->not->toBeNull()
            ->and($response->json('secret'))->not->toBeNull();
    });

    it('fetches API inbox without hmac token when agent', function () {
        $account = Account::factory()->create();
        $agent = inboxMemberOf($account);
        $inbox = apiInboxFor($account);
        $inbox->addMembers([$agent->id]);

        $response = $this->actingAs($agent)
            ->getJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}")
            ->assertOk();

        expect($response->json('id'))->toBe($inbox->id)
            ->and($response->json())->not->toHaveKey('hmac_token');
    });
});

describe('GET /api/v1/accounts/{id}/inboxes/{inboxId}/assignable_agents', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = Account::factory()->create();
        $inbox = apiInboxFor($account);

        $this->getJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}/assignable_agents")
            ->assertUnauthorized();
    });

    it('returns all assignable inbox members along with administrators', function () {
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $agent = inboxMemberOf($account);
        $inbox = apiInboxFor($account);
        $inbox->addMembers([$agent->id]);

        $response = $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}/assignable_agents")
            ->assertOk();

        expect($response->json('payload'))->toHaveCount(2)
            ->and(collect($response->json('payload'))->pluck('role'))
            ->toContain('agent', 'administrator');
    });
});

describe('POST /api/v1/accounts/{id}/inboxes', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = Account::factory()->create();

        $this->postJson("/api/v1/accounts/{$account->id}/inboxes")->assertUnauthorized();
    });

    it('will not create inbox for agent', function () {
        $account = Account::factory()->create();
        $agent = inboxMemberOf($account);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/inboxes", [
                'name' => 'test',
                'channel' => ['type' => 'api'],
            ])
            ->assertUnauthorized();
    });

    it('creates an api inbox when administrator', function () {
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);

        $response = $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/inboxes", [
                'name' => 'API Inbox',
                'channel' => ['type' => 'api', 'webhook_url' => 'http://test.com'],
            ])
            ->assertOk();

        expect($response->json('name'))->toBe('API Inbox')
            ->and($response->json('channel_type'))->toBe('Channel::Api')
            ->and($response->json('webhook_url'))->toBe('http://test.com')
            ->and($response->json('inbox_identifier'))->not->toBeNull()
            ->and($response->json('hmac_token'))->not->toBeNull()
            ->and($response->json('secret'))->not->toBeNull();

        $channel = Api::query()->find($response->json('channel_id'));
        expect($channel->account_id)->toBe($account->id);
    });

    it('rejects an unsupported channel type', function () {
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);

        $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/inboxes", [
                'name' => 'test',
                'channel' => ['type' => 'unknown'],
            ])
            ->assertUnprocessable();
    });
});

describe('PATCH /api/v1/accounts/{id}/inboxes/{inboxId}', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = Account::factory()->create();
        $inbox = apiInboxFor($account);

        $this->patchJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}")->assertUnauthorized();
    });

    it('will not update inbox for agent', function () {
        $account = Account::factory()->create();
        $agent = inboxMemberOf($account);
        $inbox = apiInboxFor($account);
        $inbox->addMembers([$agent->id]);

        $this->actingAs($agent)
            ->patchJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}", [
                'name' => 'new test inbox',
            ])
            ->assertUnauthorized();
    });

    it('updates inbox when administrator', function () {
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $inbox = apiInboxFor($account);

        $response = $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}", [
                'name' => 'new test inbox',
                'enable_auto_assignment' => false,
            ])
            ->assertOk();

        expect($response->json('name'))->toBe('new test inbox')
            ->and($inbox->refresh()->enable_auto_assignment)->toBeFalse();
    });

    it('updates api channel attributes when administrator', function () {
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $inbox = apiInboxFor($account);

        $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}", [
                'enable_auto_assignment' => false,
                'channel' => ['webhook_url' => 'webhook.test', 'selected_feature_flags' => []],
            ])
            ->assertOk();

        expect($inbox->refresh()->enable_auto_assignment)->toBeFalse()
            ->and($inbox->channel->webhook_url)->toBe('webhook.test');
    });

    it('updates the inbox avatar', function () {
        Storage::fake('public');
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $inbox = apiInboxFor($account);

        $response = $this->actingAs($admin)
            ->patch("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}", [
                'avatar' => UploadedFile::fake()->image('avatar.png'),
            ], ['Accept' => 'application/json'])
            ->assertOk();

        expect($response->json('avatar_url'))->not->toBe('')
            ->and($inbox->refresh()->avatar)->not->toBeNull();
    });
});

describe('DELETE /api/v1/accounts/{id}/inboxes/{inboxId}/avatar', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = Account::factory()->create();
        $inbox = apiInboxFor($account);

        $this->deleteJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}/avatar")
            ->assertUnauthorized();
    });

    it('deletes inbox avatar for administrator user', function () {
        Storage::fake('public');
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $inbox = apiInboxFor($account);
        $inbox->replaceAvatar(UploadedFile::fake()->image('avatar.png'));

        $this->actingAs($admin)
            ->deleteJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}/avatar")
            ->assertOk();

        expect($inbox->refresh()->avatar)->toBeNull();
    });

    it('returns unauthorized for agent user', function () {
        $account = Account::factory()->create();
        $agent = inboxMemberOf($account);
        $inbox = apiInboxFor($account);
        $inbox->addMembers([$agent->id]);

        $this->actingAs($agent)
            ->deleteJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}/avatar")
            ->assertUnauthorized();
    });
});

describe('DELETE /api/v1/accounts/{id}/inboxes/{inboxId}', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = Account::factory()->create();
        $inbox = apiInboxFor($account);

        $this->deleteJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}")->assertUnauthorized();
    });

    it('queues the deletion and responds with the deletion message', function () {
        Queue::fake();
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $inbox = apiInboxFor($account);

        $response = $this->actingAs($admin)
            ->deleteJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}")
            ->assertOk();

        expect($response->json('message'))
            ->toBe('Your inbox deletion request will be processed in some time.');
        Queue::assertPushed(DeleteObjectJob::class);
    });

    it('deleting the inbox removes its channel and members', function () {
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $agent = inboxMemberOf($account);
        $inbox = apiInboxFor($account);
        $inbox->addMembers([$agent->id]);
        $channelId = $inbox->channel_id;

        $this->actingAs($admin)
            ->deleteJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}")
            ->assertOk();

        expect(Inbox::query()->find($inbox->id))->toBeNull()
            ->and(Api::query()->find($channelId))->toBeNull()
            ->and($inbox->inboxMembers()->count())->toBe(0);
    });

    it('is unable to delete inbox of another account', function () {
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $otherInbox = apiInboxFor(Account::factory()->create());

        $this->actingAs($admin)
            ->deleteJson("/api/v1/accounts/{$account->id}/inboxes/{$otherInbox->id}")
            ->assertNotFound();
    });

    it('is unable to delete inbox as agent', function () {
        $account = Account::factory()->create();
        $agent = inboxMemberOf($account);
        $inbox = apiInboxFor($account);
        $inbox->addMembers([$agent->id]);

        $this->actingAs($agent)
            ->deleteJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}")
            ->assertUnauthorized();
    });
});

describe('POST /api/v1/accounts/{id}/inboxes/{inboxId}/reset_secret', function () {
    it('returns unauthorized for agent', function () {
        $account = Account::factory()->create();
        $agent = inboxMemberOf($account);
        $inbox = apiInboxFor($account);
        $inbox->addMembers([$agent->id]);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}/reset_secret")
            ->assertUnauthorized();
    });

    it('regenerates the webhook secret for administrator', function () {
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $inbox = apiInboxFor($account);
        $oldSecret = $inbox->channel->secret;

        $response = $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}/reset_secret")
            ->assertOk();

        expect($response->json('secret'))->not->toBe($oldSecret)
            ->and($inbox->channel->refresh()->secret)->toBe($response->json('secret'));
    });
});
