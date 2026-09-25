<?php

use App\Jobs\DeleteObjectJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Channel\Api;
use App\Models\Channel\WebWidget;
use App\Models\Inbox;
use App\Models\User;
use App\Support\Timezones;
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

function webWidgetInboxFor(Account $account): Inbox
{
    return Inbox::factory()->webWidget()->create(['account_id' => $account->id]);
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

    it('returns the widget keys and the embed script for a website inbox', function () {
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $inbox = webWidgetInboxFor($account);

        $response = $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}")
            ->assertOk();

        expect($response->json('channel_type'))->toBe('Channel::WebWidget')
            ->and($response->json('website_token'))->toBe($inbox->channel->website_token)
            ->and($response->json('hmac_token'))->toBe($inbox->channel->hmac_token)
            ->and($response->json('web_widget_script'))->toBe($inbox->channel->web_widget_script)
            ->and($response->json())->not->toHaveKey('secret');
    });

    it('hides the widget hmac token from agents', function () {
        $account = Account::factory()->create();
        $agent = inboxMemberOf($account);
        $inbox = webWidgetInboxFor($account);
        $inbox->addMembers([$agent->id]);

        $response = $this->actingAs($agent)
            ->getJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}")
            ->assertOk();

        expect($response->json())->not->toHaveKey('hmac_token')
            ->and($response->json('website_token'))->not->toBeNull();
    });

    it('keeps the widget keys null for an api inbox', function () {
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $inbox = apiInboxFor($account);

        $response = $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}")
            ->assertOk();

        expect($response->json('website_token'))->toBeNull()
            ->and($response->json('web_widget_script'))->toBeNull()
            ->and($response->json('selected_feature_flags'))->toBeNull()
            ->and($response->json('reply_time'))->toBeNull()
            ->and($response->json())->not->toHaveKey('pre_chat_form_options');
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

    it('creates a webwidget inbox when administrator', function () {
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);

        $response = $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/inboxes", [
                'name' => 'test',
                'channel' => ['type' => 'web_widget', 'website_url' => 'test.com'],
            ])
            ->assertOk();

        expect($response->json('name'))->toBe('test')
            ->and($response->json('channel_type'))->toBe('Channel::WebWidget')
            ->and($response->json('website_url'))->toBe('test.com')
            ->and($response->json('widget_color'))->toBe('#1f93ff')
            ->and($response->json('reply_time'))->toBe('in_a_few_minutes')
            ->and($response->json('continuity_via_email'))->toBeTrue()
            ->and($response->json('allowed_domains'))->toBe('')
            ->and($response->json('pre_chat_form_enabled'))->toBeFalse()
            ->and($response->json('pre_chat_form_options.pre_chat_fields'))->toHaveCount(3)
            ->and($response->json('selected_feature_flags'))
            ->toBe(['attachments', 'emoji_picker', 'end_conversation'])
            ->and($response->json('website_token'))->not->toBeNull()
            ->and($response->json('hmac_token'))->not->toBeNull()
            ->and($response->json('web_widget_script'))->toContain($response->json('website_token'));

        $channel = WebWidget::query()->find($response->json('channel_id'));
        expect($channel->account_id)->toBe($account->id);
    });

    it('creates the webwidget inbox that allows messages after conversation is resolved', function () {
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);

        $response = $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/inboxes", [
                'name' => 'test',
                'channel' => ['type' => 'web_widget', 'website_url' => 'test.com'],
            ])
            ->assertOk();

        expect($response->json('allow_messages_after_resolved'))->toBeTrue();
    });

    it('stores the widget appearance sent by the wizard', function () {
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);

        $response = $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/inboxes", [
                'name' => 'test',
                'greeting_enabled' => true,
                'greeting_message' => 'Hello there',
                'channel' => [
                    'type' => 'web_widget',
                    'website_url' => 'test.com',
                    'widget_color' => '#009CE0',
                    'welcome_title' => 'Hi there',
                    'welcome_tagline' => 'We are here to help',
                ],
            ])
            ->assertOk();

        expect($response->json('widget_color'))->toBe('#009CE0')
            ->and($response->json('welcome_title'))->toBe('Hi there')
            ->and($response->json('welcome_tagline'))->toBe('We are here to help')
            ->and($response->json('greeting_enabled'))->toBeTrue();
    });

    it('creates a webwidget inbox without a website url', function () {
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);

        $response = $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/inboxes", [
                'name' => 'test',
                'channel' => ['type' => 'web_widget'],
            ])
            ->assertOk();

        expect($response->json('channel_type'))->toBe('Channel::WebWidget')
            ->and($response->json('website_url'))->toBeNull();
    });

    it('keeps the stored website url when the settings form no longer sends it', function () {
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);

        $inboxId = $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/inboxes", [
                'name' => 'test',
                'channel' => ['type' => 'web_widget', 'website_url' => 'shop.test'],
            ])
            ->json('id');

        $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}/inboxes/{$inboxId}", [
                'name' => 'Shop',
                'channel' => ['widget_color' => '#E0115F'],
            ])
            ->assertOk()
            ->assertJsonPath('website_url', 'shop.test');
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

    it('updates webwidget channel attributes when administrator', function () {
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $inbox = webWidgetInboxFor($account);

        $response = $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}", [
                'channel' => [
                    'widget_color' => '#ff0000',
                    'welcome_title' => 'Welcome',
                    'welcome_tagline' => 'Ask us anything',
                    'reply_time' => 'in_a_day',
                    'continuity_via_email' => false,
                    'allowed_domains' => 'example.com',
                ],
            ])
            ->assertOk();

        $channel = $inbox->refresh()->channel;

        expect($channel->widget_color)->toBe('#ff0000')
            ->and($channel->welcome_title)->toBe('Welcome')
            ->and($channel->welcome_tagline)->toBe('Ask us anything')
            ->and($channel->reply_time)->toBe('in_a_day')
            ->and($channel->continuity_via_email)->toBeFalse()
            ->and($channel->allowed_domains)->toBe('example.com')
            ->and($response->json('reply_time'))->toBe('in_a_day');
    });

    it('updates the widget feature flags when administrator', function () {
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $inbox = webWidgetInboxFor($account);

        $response = $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}", [
                'channel' => ['selected_feature_flags' => ['attachments', 'allow_mobile_webview']],
            ])
            ->assertOk();

        expect($response->json('selected_feature_flags'))->toBe(['attachments', 'allow_mobile_webview'])
            ->and($inbox->refresh()->channel->feature_flags)->toBe(17);
    });

    it('clears the widget feature flags when the form sends a blank entry', function () {
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $inbox = webWidgetInboxFor($account);

        $response = $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}", [
                'channel' => ['selected_feature_flags' => ['']],
            ])
            ->assertOk();

        expect($response->json('selected_feature_flags'))->toBe([])
            ->and($inbox->refresh()->channel->feature_flags)->toBe(0);
    });

    it('toggles hmac mandatory on the widget channel', function () {
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $inbox = webWidgetInboxFor($account);

        $response = $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}", [
                'channel' => ['hmac_mandatory' => true],
            ])
            ->assertOk();

        expect($response->json('hmac_mandatory'))->toBeTrue()
            ->and($inbox->refresh()->channel->hmac_mandatory)->toBeTrue();
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
        $updatedAtBeforeRemoval = $inbox->refresh()->updated_at;
        $this->travel(1)->minutes();

        $this->actingAs($admin)
            ->deleteJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}/avatar")
            ->assertOk();

        $inbox->refresh();
        expect($inbox->avatar)->toBeNull()
            ->and($inbox->updated_at->greaterThan($updatedAtBeforeRemoval))->toBeTrue();
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

describe('working hours qua PATCH inbox', function () {
    it('returns the weekly schedule of the inbox', function () {
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $inbox = apiInboxFor($account);

        $response = $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}")
            ->assertOk();

        expect($response->json('working_hours'))->toHaveCount(7)
            ->and($response->json('working_hours.0'))->toBe([
                'day_of_week' => 0,
                'closed_all_day' => true,
                'open_hour' => null,
                'open_minutes' => null,
                'close_hour' => null,
                'close_minutes' => null,
                'open_all_day' => false,
            ]);
    });

    it('updates the working hours sent alongside the inbox attributes', function () {
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $inbox = apiInboxFor($account);

        $response = $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}", [
                'working_hours_enabled' => true,
                'out_of_office_message' => 'We are away',
                'timezone' => 'Asia/Ho_Chi_Minh',
                'working_hours' => [
                    ['day_of_week' => 0, 'closed_all_day' => false, 'open_hour' => 8, 'open_minutes' => 30, 'close_hour' => 12, 'close_minutes' => 0, 'open_all_day' => false],
                    ['day_of_week' => 1, 'closed_all_day' => false, 'open_hour' => 0, 'open_minutes' => 0, 'close_hour' => 0, 'close_minutes' => 0, 'open_all_day' => true],
                ],
            ])
            ->assertOk();

        $schedule = collect($response->json('working_hours'))->keyBy('day_of_week');

        expect($response->json('working_hours_enabled'))->toBeTrue()
            ->and($response->json('timezone'))->toBe('Asia/Ho_Chi_Minh')
            ->and($schedule[0]['open_hour'])->toBe(8)
            ->and($schedule[0]['open_minutes'])->toBe(30)
            ->and($schedule[1]['open_all_day'])->toBeTrue()
            ->and($schedule[1]['close_hour'])->toBe(23)
            ->and($schedule[1]['close_minutes'])->toBe(59)
            ->and($schedule[2]['open_hour'])->toBe(9);
    });

    it('creates a new inbox on Vietnam time', function () {
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);

        $response = $this->actingAs($admin)
            ->postJson("/api/v1/accounts/{$account->id}/inboxes", [
                'name' => 'test',
                'channel' => ['type' => 'web_widget', 'website_url' => 'test.com'],
            ])
            ->assertOk();

        expect($response->json('timezone'))->toBe(Inbox::DEFAULT_TIMEZONE)
            ->and(Inbox::DEFAULT_TIMEZONE)->toBe('Asia/Ho_Chi_Minh');
    });

    it('keeps the stored timezone when the working hours tab is saved without a timezone change', function () {
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $inbox = apiInboxFor($account);
        $inbox->update(['timezone' => 'UTC']);

        $response = $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}", [
                'working_hours_enabled' => false,
                'out_of_office_message' => '',
                'timezone' => 'UTC',
                'working_hours' => [
                    ['day_of_week' => 1, 'closed_all_day' => false, 'open_hour' => 9, 'open_minutes' => 0, 'close_hour' => 17, 'close_minutes' => 0, 'open_all_day' => false],
                ],
                'channel' => [],
            ])
            ->assertOk();

        expect($response->json('timezone'))->toBe('UTC')
            ->and($inbox->fresh()->timezone)->toBe('UTC');
    });

    it('saves every timezone that the working hours tab offers', function () {
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $inbox = apiInboxFor($account);

        $offered = array_column(Timezones::options(), 'value');
        $saved = [];

        foreach ($offered as $timezone) {
            $this->actingAs($admin)
                ->patchJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}", ['timezone' => $timezone])
                ->assertOk();

            $saved[] = $inbox->fresh()->timezone;
        }

        expect($saved)->toBe($offered)
            ->and($offered)->toContain('UTC', 'Asia/Ho_Chi_Minh');
    });

    it('rejects a timezone that does not exist', function () {
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $inbox = apiInboxFor($account);

        $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}", ['timezone' => 'Asia/Atlantis'])
            ->assertUnprocessable();
    });

    it('leaves the schedule untouched when the payload has no working hours', function () {
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $inbox = apiInboxFor($account);

        $response = $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}", ['name' => 'Renamed'])
            ->assertOk();

        expect(collect($response->json('working_hours'))->keyBy('day_of_week')[1]['open_hour'])->toBe(9);
    });

    it('rejects a day of week outside the week', function () {
        $account = Account::factory()->create();
        $admin = inboxMemberOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $inbox = apiInboxFor($account);

        $this->actingAs($admin)
            ->patchJson("/api/v1/accounts/{$account->id}/inboxes/{$inbox->id}", [
                'working_hours' => [['day_of_week' => 9, 'closed_all_day' => true]],
            ])
            ->assertStatus(422);
    });
});
