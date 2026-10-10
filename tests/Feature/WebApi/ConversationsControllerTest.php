<?php

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Label;
use App\Models\Message;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;

// Port từ spec/controllers/api/v1/accounts/conversations_controller_spec.rb.
// Bỏ: search/filter (E2/E1), transcript (F1), destroy (DeleteService),
// attachments (B9), custom_attributes (E1), agent bot (D4).
// Case "authenticated bot" chuyển thành token
// của user (AgentBot chưa port — cùng đường AccessTokenAuthHelper).
// Khác bản gốc: user ngoài account nhận 404 từ SetCurrentAccount (bản gốc 401) —
// giữ nguyên theo hành vi các test WebApi hiện có.

function conversationApiUserOf(Account $account, int $role = AccountUser::ROLE_AGENT): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create([
        'account_id' => $account->id,
        'user_id' => $user->id,
        'role' => $role,
    ]);

    return $user;
}

function conversationApiFixtures(): array
{
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);
    $contact = Contact::factory()->create(['account_id' => $account->id]);
    $contactInbox = ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $inbox->id]);

    return [$account, $inbox, $contact, $contactInbox];
}

function conversationApiConversation(array $fixtures, array $attributes = []): Conversation
{
    [$account, $inbox, $contact, $contactInbox] = $fixtures;

    return Conversation::factory()->create([
        'account_id' => $account->id,
        'inbox_id' => $inbox->id,
        'contact_id' => $contact->id,
        'contact_inbox_id' => $contactInbox->id,
        ...$attributes,
    ]);
}

describe('GET /api/v1/accounts/{id}/conversations', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = Account::factory()->create();

        $this->getJson("/api/v1/accounts/{$account->id}/conversations")->assertUnauthorized();
    });

    it('returns all conversations with messages', function () {
        $fixtures = conversationApiFixtures();
        [$account, $inbox] = $fixtures;
        $agent = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id]);
        $conversation = conversationApiConversation($fixtures);
        $message = Message::factory()->create([
            'account_id' => $account->id,
            'inbox_id' => $inbox->id,
            'conversation_id' => $conversation->id,
        ]);

        $response = $this->actingAs($agent)
            ->getJson("/api/v1/accounts/{$account->id}/conversations")
            ->assertOk();

        expect($response->json('data.meta.all_count'))->toBe(1)
            ->and($response->json('data.meta'))->toHaveKeys(['all_count', 'mine_count', 'assigned_count', 'unassigned_count'])
            ->and($response->json('data.payload.0.id'))->toBe($conversation->display_id)
            ->and($response->json('data.payload.0.uuid'))->toBe($conversation->uuid)
            ->and($response->json('data.payload.0.status'))->toBe('open')
            ->and($response->json('data.payload.0.messages.0.id'))->toBe($message->id);
    });

    it('returns conversations with empty messages array for conversations without messages', function () {
        $fixtures = conversationApiFixtures();
        [$account, $inbox] = $fixtures;
        $agent = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id]);
        conversationApiConversation($fixtures);

        $response = $this->actingAs($agent)
            ->getJson("/api/v1/accounts/{$account->id}/conversations")
            ->assertOk();

        expect($response->json('data.meta.all_count'))->toBe(1)
            ->and($response->json('data.payload.0.messages'))->toBe([]);
    });

    it('does not return conversations from inboxes the agent is not a member of', function () {
        $fixtures = conversationApiFixtures();
        [$account] = $fixtures;
        $agent = conversationApiUserOf($account);
        conversationApiConversation($fixtures);

        $response = $this->actingAs($agent)
            ->getJson("/api/v1/accounts/{$account->id}/conversations")
            ->assertOk();

        expect($response->json('data.meta.all_count'))->toBe(0)
            ->and($response->json('data.payload'))->toBe([]);
    });

    it('authenticates with an api_access_token header without a session', function () {
        $fixtures = conversationApiFixtures();
        [$account] = $fixtures;
        $admin = conversationApiUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        conversationApiConversation($fixtures);

        $response = $this->getJson(
            "/api/v1/accounts/{$account->id}/conversations",
            ['api_access_token' => $admin->accessToken->token]
        )->assertOk();

        expect($response->json('data.meta.all_count'))->toBe(1);
    });

    it('returns invalid access token error for a wrong token', function () {
        $account = Account::factory()->create();

        $this->getJson("/api/v1/accounts/{$account->id}/conversations", ['api_access_token' => 'wrong-token'])
            ->assertUnauthorized()
            ->assertJson(['error' => 'Invalid Access Token']);
    });
});

describe('GET /api/v1/accounts/{id}/conversations/meta', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = Account::factory()->create();

        $this->getJson("/api/v1/accounts/{$account->id}/conversations/meta")->assertUnauthorized();
    });

    it('returns all conversations counts', function () {
        $fixtures = conversationApiFixtures();
        [$account, $inbox] = $fixtures;
        $agent = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id]);
        conversationApiConversation($fixtures);

        $response = $this->actingAs($agent)
            ->getJson("/api/v1/accounts/{$account->id}/conversations/meta")
            ->assertOk();

        expect($response->json('meta'))->toHaveKeys(['all_count', 'mine_count', 'assigned_count', 'unassigned_count'])
            ->and($response->json('meta.all_count'))->toBe(1);
    });
});

describe('GET /api/v1/accounts/{id}/conversations/{conversationId}', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $fixtures = conversationApiFixtures();
        $conversation = conversationApiConversation($fixtures);

        $this->getJson("/api/v1/accounts/{$fixtures[0]->id}/conversations/{$conversation->display_id}")
            ->assertUnauthorized();
    });

    it('does not show the conversation if you do not have access to it', function () {
        $fixtures = conversationApiFixtures();
        [$account] = $fixtures;
        $agent = conversationApiUserOf($account);
        $conversation = conversationApiConversation($fixtures);

        $this->actingAs($agent)
            ->getJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}")
            ->assertUnauthorized();
    });

    it('shows the conversation if you are an administrator', function () {
        $fixtures = conversationApiFixtures();
        [$account] = $fixtures;
        $admin = conversationApiUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $conversation = conversationApiConversation($fixtures);

        $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}")
            ->assertOk()
            ->assertJsonPath('id', $conversation->display_id);
    });

    it('shows the conversation if you are an agent with access to inbox', function () {
        $fixtures = conversationApiFixtures();
        [$account, $inbox] = $fixtures;
        $agent = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id]);
        $conversation = conversationApiConversation($fixtures);

        $this->actingAs($agent)
            ->getJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}")
            ->assertOk()
            ->assertJsonPath('id', $conversation->display_id);
    });

    it('returns not found for a conversation of another account', function () {
        $account = Account::factory()->create();
        $admin = conversationApiUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $otherConversation = Conversation::factory()->create();

        $this->actingAs($admin)
            ->getJson("/api/v1/accounts/{$account->id}/conversations/{$otherConversation->display_id}")
            ->assertNotFound();
    });
});

describe('POST /api/v1/accounts/{id}/conversations', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $fixtures = conversationApiFixtures();

        $this->postJson("/api/v1/accounts/{$fixtures[0]->id}/conversations", ['source_id' => $fixtures[3]->source_id])
            ->assertUnauthorized();
    });

    it('will not create a new conversation if agent does not have access to inbox', function () {
        $fixtures = conversationApiFixtures();
        [$account, , , $contactInbox] = $fixtures;
        $agent = conversationApiUserOf($account);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations", [
                'source_id' => $contactInbox->source_id,
                'additional_attributes' => ['test' => 'test'],
            ])
            ->assertUnauthorized();

        expect(Conversation::query()->count())->toBe(0);
    });

    it('creates a new conversation', function () {
        $fixtures = conversationApiFixtures();
        [$account, $inbox, , $contactInbox] = $fixtures;
        $agent = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id]);

        $response = $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations", [
                'source_id' => $contactInbox->source_id,
                'additional_attributes' => ['test' => 'test'],
            ])
            ->assertOk();

        expect($response->json('additional_attributes'))->toBe(['test' => 'test'])
            ->and(Conversation::query()->count())->toBe(1);
    });

    it('does not create a new conversation if source_id is not unique', function () {
        $fixtures = conversationApiFixtures();
        [$account, $inbox, , $contactInbox] = $fixtures;
        $agent = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id]);
        $newContact = Contact::factory()->create(['account_id' => $account->id]);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations", [
                'source_id' => $contactInbox->source_id,
                'inbox_id' => $inbox->id,
                'contact_id' => $newContact->id,
            ])
            ->assertStatus(422)
            ->assertJson(['error' => 'source_id should be unique']);
    });

    it('creates a conversation in specified status', function () {
        $fixtures = conversationApiFixtures();
        [$account, $inbox, , $contactInbox] = $fixtures;
        $agent = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id]);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations", [
                'source_id' => $contactInbox->source_id,
                'status' => 'pending',
            ])
            ->assertOk()
            ->assertJsonPath('status', 'pending');
    });

    it('creates a new conversation with message when message is passed', function () {
        $fixtures = conversationApiFixtures();
        [$account, $inbox, , $contactInbox] = $fixtures;
        $agent = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id]);

        $response = $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations", [
                'source_id' => $contactInbox->source_id,
                'message' => ['content' => 'hi'],
            ])
            ->assertOk();

        $conversation = $account->conversations()->where('display_id', $response->json('id'))->firstOrFail();

        expect($response->json('additional_attributes'))->toBe([])
            ->and($conversation->messages()->outgoing()->first()->content)->toBe('hi');
    });

    it('creates a contact inbox when contact_id and inbox_id are present', function () {
        $fixtures = conversationApiFixtures();
        [$account, $inbox, $contact] = $fixtures;
        $agent = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id]);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations", [
                'contact_id' => $contact->id,
                'inbox_id' => $inbox->id,
                'hmac_verified' => 'false',
            ])
            ->assertOk();

        expect(ContactInbox::query()->where('contact_id', $contact->id)->count())->toBe(2)
            ->and(Conversation::query()->count())->toBe(1);
    });

    it('opens an email conversation addressed to the contact email', function () {
        Queue::fake();
        $account = Account::factory()->create();
        $inbox = Inbox::factory()->email()->create(['account_id' => $account->id]);
        $contact = Contact::factory()->create(['account_id' => $account->id, 'email' => 'khach@example.com']);
        $agent = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id]);

        $response = $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations", [
                'contact_id' => $contact->id,
                'inbox_id' => $inbox->id,
                'message' => ['content' => 'Chào bạn'],
                'additional_attributes' => ['mail_subject' => 'Báo giá'],
            ])
            ->assertOk();

        $conversation = $account->conversations()->where('display_id', $response->json('id'))->firstOrFail();

        expect($conversation->contactInbox->source_id)->toBe('khach@example.com')
            ->and($conversation->messages()->outgoing()->first()->content)->toBe('Chào bạn');
    });

    it('refuses an email conversation for a contact without email', function () {
        $account = Account::factory()->create();
        $inbox = Inbox::factory()->email()->create(['account_id' => $account->id]);
        $contact = Contact::factory()->create(['account_id' => $account->id, 'email' => null]);
        $agent = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id]);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations", [
                'contact_id' => $contact->id,
                'inbox_id' => $inbox->id,
            ])
            ->assertUnprocessable()
            ->assertJson(['error' => __('errors.conversations.contact_unreachable')]);

        expect(Conversation::query()->count())->toBe(0);
    });

    it('creates a resolved conversation for a blocked contact', function () {
        $fixtures = conversationApiFixtures();
        [$account, $inbox, $contact, $contactInbox] = $fixtures;
        $contact->update(['blocked' => true]);
        $agent = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id]);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations", ['source_id' => $contactInbox->source_id])
            ->assertOk()
            ->assertJsonPath('status', 'resolved');
    });

    it('creates a new conversation with assignee and team', function () {
        $fixtures = conversationApiFixtures();
        [$account, $inbox, $contact, $contactInbox] = $fixtures;
        $agent = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id]);
        $team = Team::factory()->create(['account_id' => $account->id]);
        $team->addMembers([$agent->id]);

        $response = $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations", [
                'source_id' => $contactInbox->source_id,
                'contact_id' => $contact->id,
                'inbox_id' => $inbox->id,
                'assignee_id' => $agent->id,
                'team_id' => $team->id,
            ])
            ->assertOk();

        expect($response->json('meta.assignee.name'))->toBe($agent->name)
            ->and($response->json('meta.team.name'))->toBe($team->name);
    });

    it('does not create a conversation in another account from its source_id', function () {
        $account = Account::factory()->create();
        $admin = conversationApiUserOf($account, AccountUser::ROLE_ADMINISTRATOR);
        $otherContactInbox = ContactInbox::factory()->create();

        $this->postJson(
            "/api/v1/accounts/{$account->id}/conversations",
            ['source_id' => $otherContactInbox->source_id, 'message' => ['content' => 'hi']],
            ['api_access_token' => $admin->accessToken->token]
        )->assertNotFound();

        expect(Conversation::query()->count())->toBe(0);
    });

    it('creates a conversation via api_access_token without CSRF or session', function () {
        $fixtures = conversationApiFixtures();
        [$account, , , $contactInbox] = $fixtures;
        $admin = conversationApiUserOf($account, AccountUser::ROLE_ADMINISTRATOR);

        $this->postJson(
            "/api/v1/accounts/{$account->id}/conversations",
            ['source_id' => $contactInbox->source_id],
            ['api_access_token' => $admin->accessToken->token]
        )->assertOk();

        expect($account->conversations()->count())->toBe(1);
    });
});

describe('POST /api/v1/accounts/{id}/conversations/{id}/toggle_typing_status', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $conversation = conversationApiConversation(conversationApiFixtures());

        $this->postJson("/api/v1/accounts/{$conversation->account_id}/conversations/{$conversation->display_id}/toggle_typing_status")
            ->assertUnauthorized();
    });

    it('dispatches the typing event for inbox member', function () {
        Event::fake([DomainEvent::class]);
        $fixtures = conversationApiFixtures();
        [$account, $inbox] = $fixtures;
        $agent = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id]);
        $conversation = conversationApiConversation($fixtures);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/toggle_typing_status", [
                'typing_status' => 'on',
                'is_private' => false,
            ])
            ->assertOk()
            ->assertNoContent(200);

        Event::assertDispatched(DomainEvent::class, fn (DomainEvent $event) => $event->type === EventType::CONVERSATION_TYPING_ON
            && $event->data['conversation']->is($conversation)
            && $event->data['user']->is($agent)
            && $event->data['is_private'] === false);
    });

    it('dispatches the typing event for private notes', function () {
        Event::fake([DomainEvent::class]);
        $fixtures = conversationApiFixtures();
        [$account, $inbox] = $fixtures;
        $agent = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id]);
        $conversation = conversationApiConversation($fixtures);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/toggle_typing_status", [
                'typing_status' => 'on',
                'is_private' => true,
            ])
            ->assertOk();

        Event::assertDispatched(DomainEvent::class, fn (DomainEvent $event) => $event->type === EventType::CONVERSATION_TYPING_ON
            && $event->data['is_private'] === true);
    });

    it('dispatches typing off', function () {
        Event::fake([DomainEvent::class]);
        $fixtures = conversationApiFixtures();
        [$account, $inbox] = $fixtures;
        $agent = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id]);
        $conversation = conversationApiConversation($fixtures);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/toggle_typing_status", [
                'typing_status' => 'off',
            ])
            ->assertOk();

        Event::assertDispatched(DomainEvent::class, fn (DomainEvent $event) => $event->type === EventType::CONVERSATION_TYPING_OFF
            && $event->data['is_private'] === false);
    });

    it('does nothing but responds ok when typing_status is unknown', function () {
        Event::fake([DomainEvent::class]);
        $fixtures = conversationApiFixtures();
        [$account, $inbox] = $fixtures;
        $agent = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id]);
        $conversation = conversationApiConversation($fixtures);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/toggle_typing_status", [
                'typing_status' => 'paused',
            ])
            ->assertOk();

        Event::assertNotDispatched(DomainEvent::class, fn (DomainEvent $event) => in_array($event->type, [EventType::CONVERSATION_TYPING_ON, EventType::CONVERSATION_TYPING_OFF], true));
    });

    it('rejects agent who is not inbox member', function () {
        Event::fake([DomainEvent::class]);
        $fixtures = conversationApiFixtures();
        [$account] = $fixtures;
        $agent = conversationApiUserOf($account);
        $conversation = conversationApiConversation($fixtures);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/toggle_typing_status", [
                'typing_status' => 'on',
            ])
            ->assertUnauthorized();

        // Hook model vẫn bắn DomainEvent khác (conversation.created…) — chỉ khóa typing.
        Event::assertNotDispatched(DomainEvent::class, fn (DomainEvent $event) => $event->type === EventType::CONVERSATION_TYPING_ON);
    });
});

describe('PATCH /api/v1/accounts/{id}/conversations/{id}', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $conversation = conversationApiConversation(conversationApiFixtures());

        $this->patchJson("/api/v1/accounts/{$conversation->account_id}/conversations/{$conversation->display_id}", ['priority' => 'high'])
            ->assertUnauthorized();
    });

    it('does not update the conversation if you do not have access to it', function () {
        $fixtures = conversationApiFixtures();
        $agent = conversationApiUserOf($fixtures[0]);
        $conversation = conversationApiConversation($fixtures);

        $this->actingAs($agent)
            ->patchJson("/api/v1/accounts/{$fixtures[0]->id}/conversations/{$conversation->display_id}", ['priority' => 'high'])
            ->assertUnauthorized();
    });

    it('updates the conversation if you are an administrator', function () {
        $fixtures = conversationApiFixtures();
        $administrator = conversationApiUserOf($fixtures[0], AccountUser::ROLE_ADMINISTRATOR);
        $conversation = conversationApiConversation($fixtures);

        $this->actingAs($administrator)
            ->patchJson("/api/v1/accounts/{$fixtures[0]->id}/conversations/{$conversation->display_id}", ['priority' => 'high'])
            ->assertOk()
            ->assertJsonPath('priority', 'high')
            ->assertJsonPath('id', $conversation->display_id);

        expect($conversation->fresh()->priorityName())->toBe('high');
    });

    it('updates the conversation if you are an agent with access to inbox', function () {
        $fixtures = conversationApiFixtures();
        $agent = conversationApiUserOf($fixtures[0]);
        $fixtures[1]->addMembers([$agent->id]);
        $conversation = conversationApiConversation($fixtures);

        $this->actingAs($agent)
            ->putJson("/api/v1/accounts/{$fixtures[0]->id}/conversations/{$conversation->display_id}", ['priority' => 'high'])
            ->assertOk()
            ->assertJsonPath('priority', 'high');
    });
});

describe('POST /api/v1/accounts/{id}/conversations/{id}/toggle_status', function () {
    function toggleStatusSetup(int $role = AccountUser::ROLE_AGENT): array
    {
        $fixtures = conversationApiFixtures();
        $user = conversationApiUserOf($fixtures[0], $role);
        $fixtures[1]->addMembers([$user->id]);
        $conversation = conversationApiConversation($fixtures);

        return [$fixtures[0], $user, $conversation];
    }

    it('returns unauthorized for unauthenticated user', function () {
        $conversation = conversationApiConversation(conversationApiFixtures());

        $this->postJson("/api/v1/accounts/{$conversation->account_id}/conversations/{$conversation->display_id}/toggle_status")
            ->assertUnauthorized();
    });

    it('toggles the conversation status if status is empty', function () {
        [$account, $agent, $conversation] = toggleStatusSetup();
        expect($conversation->statusName())->toBe('open');

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/toggle_status", ['status' => ''])
            ->assertOk()
            ->assertExactJson([
                'meta' => [],
                'payload' => [
                    'success' => true,
                    'conversation_id' => $conversation->display_id,
                    'current_status' => 'resolved',
                    'snoozed_until' => null,
                ],
            ]);

        expect($conversation->fresh()->statusName())->toBe('resolved');
    });

    it('toggles the conversation status to open from pending', function () {
        [$account, $agent, $conversation] = toggleStatusSetup();
        $conversation->update(['status' => Conversation::STATUS_PENDING]);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/toggle_status", ['status' => 'open'])
            ->assertOk()
            ->assertJsonPath('payload.current_status', 'open');

        expect($conversation->fresh()->statusName())->toBe('open');
    });

    it('self assigns if agent changes the conversation status to open', function () {
        [$account, $agent, $conversation] = toggleStatusSetup();
        $conversation->update(['status' => Conversation::STATUS_PENDING]);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/toggle_status")
            ->assertOk();

        expect($conversation->fresh()->statusName())->toBe('open')
            ->and($conversation->fresh()->assignee_id)->toBe($agent->id);
    });

    it('does not self assign if admin changes the conversation status to open', function () {
        [$account, $administrator, $conversation] = toggleStatusSetup(AccountUser::ROLE_ADMINISTRATOR);
        $conversation->update(['status' => Conversation::STATUS_PENDING, 'assignee_id' => null]);

        $this->actingAs($administrator)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/toggle_status")
            ->assertOk();

        expect($conversation->fresh()->statusName())->toBe('open')
            ->and($conversation->fresh()->assignee_id)->toBeNull();
    });

    it('toggles the conversation status to specific status when parameter is passed', function () {
        [$account, $agent, $conversation] = toggleStatusSetup();

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/toggle_status", ['status' => 'pending'])
            ->assertOk();

        expect($conversation->fresh()->statusName())->toBe('pending');
    });

    it('toggles the conversation status to snoozed when parameter is passed', function () {
        [$account, $agent, $conversation] = toggleStatusSetup();
        $snoozedUntil = now()->addDays(2)->getTimestamp();

        $response = $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/toggle_status", [
                'status' => 'snoozed',
                'snoozed_until' => $snoozedUntil,
            ])
            ->assertOk()
            ->assertJsonPath('payload.current_status', 'snoozed');

        expect($conversation->fresh()->statusName())->toBe('snoozed')
            ->and($conversation->fresh()->snoozed_until->getTimestamp())->toBe($snoozedUntil)
            ->and(Carbon::parse($response->json('payload.snoozed_until'))->getTimestamp())->toBe($snoozedUntil);
    });

    it('snoozes until the next reply without storing the Unix epoch', function () {
        [$account, $agent, $conversation] = toggleStatusSetup();

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/toggle_status", [
                'status' => 'snoozed',
                'snoozed_until' => null,
            ])
            ->assertOk()
            ->assertJsonPath('payload.current_status', 'snoozed')
            ->assertJsonPath('payload.snoozed_until', null);

        expect($conversation->fresh()->statusName())->toBe('snoozed')
            ->and($conversation->fresh()->snoozed_until)->toBeNull();
    });

    it('rejects an unknown status', function () {
        [$account, $agent, $conversation] = toggleStatusSetup();

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/toggle_status", ['status' => 'closed'])
            ->assertUnprocessable();
    });

    it('creates the activity message and dispatches status events', function () {
        [$account, $agent, $conversation] = toggleStatusSetup();
        Event::fake([DomainEvent::class]);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/toggle_status", ['status' => 'resolved'])
            ->assertOk();

        Event::assertDispatched(DomainEvent::class, fn (DomainEvent $event) => $event->type === EventType::CONVERSATION_STATUS_CHANGED
            && $event->data['performed_by']->is($agent));
        Event::assertDispatched(DomainEvent::class, fn (DomainEvent $event) => $event->type === EventType::CONVERSATION_RESOLVED);
        expect($conversation->messages()->where('message_type', Message::TYPE_ACTIVITY)->value('content'))
            ->toBe("Conversation was marked resolved by {$agent->name}");
    });
});

describe('POST /api/v1/accounts/{id}/conversations/{id}/toggle_priority', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $conversation = conversationApiConversation(conversationApiFixtures());

        $this->postJson("/api/v1/accounts/{$conversation->account_id}/conversations/{$conversation->display_id}/toggle_priority")
            ->assertUnauthorized();
    });

    it('sets the conversation priority when a value is passed', function () {
        $fixtures = conversationApiFixtures();
        $agent = conversationApiUserOf($fixtures[0]);
        $fixtures[1]->addMembers([$agent->id]);
        $conversation = conversationApiConversation($fixtures);
        expect($conversation->priority)->toBeNull();

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$fixtures[0]->id}/conversations/{$conversation->display_id}/toggle_priority", ['priority' => 'low'])
            ->assertOk()
            ->assertNoContent(200);

        expect($conversation->fresh()->priorityName())->toBe('low');
    });

    it('toggles the conversation priority to null if no value is passed', function () {
        $fixtures = conversationApiFixtures();
        $agent = conversationApiUserOf($fixtures[0]);
        $fixtures[1]->addMembers([$agent->id]);
        $conversation = conversationApiConversation($fixtures, ['priority' => Conversation::PRIORITY_LOW]);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$fixtures[0]->id}/conversations/{$conversation->display_id}/toggle_priority")
            ->assertOk();

        expect($conversation->fresh()->priority)->toBeNull();
    });
});

describe('POST /api/v1/accounts/{id}/conversations/{id}/mute + unmute', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $conversation = conversationApiConversation(conversationApiFixtures());

        $this->postJson("/api/v1/accounts/{$conversation->account_id}/conversations/{$conversation->display_id}/mute")->assertUnauthorized();
        $this->postJson("/api/v1/accounts/{$conversation->account_id}/conversations/{$conversation->display_id}/unmute")->assertUnauthorized();
    });

    it('mutes then unmutes the conversation', function () {
        $fixtures = conversationApiFixtures();
        $agent = conversationApiUserOf($fixtures[0]);
        $fixtures[1]->addMembers([$agent->id]);
        $conversation = conversationApiConversation($fixtures);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$fixtures[0]->id}/conversations/{$conversation->display_id}/mute")
            ->assertOk()
            ->assertNoContent(200);

        expect($conversation->fresh()->isResolved())->toBeTrue()
            ->and($conversation->fresh()->isMuted())->toBeTrue();

        $this->actingAs($agent)
            ->getJson("/api/v1/accounts/{$fixtures[0]->id}/conversations/{$conversation->display_id}")
            ->assertJsonPath('muted', true);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$fixtures[0]->id}/conversations/{$conversation->display_id}/unmute")
            ->assertOk();

        expect($conversation->fresh()->isMuted())->toBeFalse();
    });
});

describe('POST /api/v1/accounts/{id}/conversations/{id}/update_last_seen', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $fixtures = conversationApiFixtures();
        [$account] = $fixtures;
        $conversation = conversationApiConversation($fixtures);

        $this->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/update_last_seen")
            ->assertUnauthorized();
    });

    it('updates agent last seen', function () {
        $fixtures = conversationApiFixtures();
        [$account, $inbox] = $fixtures;
        $agent = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id]);
        $conversation = conversationApiConversation($fixtures, ['agent_last_seen_at' => null]);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/update_last_seen")
            ->assertNoContent();

        expect($conversation->fresh()->agent_last_seen_at)->not->toBeNull();
    });

    it('updates assignee last seen when the caller is the assignee', function () {
        $fixtures = conversationApiFixtures();
        [$account, $inbox] = $fixtures;
        $agent = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id]);
        $conversation = conversationApiConversation($fixtures, ['agent_last_seen_at' => null, 'assignee_id' => $agent->id]);

        expect($conversation->fresh()->assignee_last_seen_at)->toBeNull();

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/update_last_seen")
            ->assertNoContent();

        expect($conversation->fresh()->assignee_last_seen_at)->not->toBeNull();
    });

    it('leaves assignee last seen alone when the caller is not the assignee', function () {
        $fixtures = conversationApiFixtures();
        [$account, $inbox] = $fixtures;
        $agent = conversationApiUserOf($account);
        $assignee = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id, $assignee->id]);
        $conversation = conversationApiConversation($fixtures, ['agent_last_seen_at' => null, 'assignee_id' => $assignee->id]);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/update_last_seen")
            ->assertNoContent();

        expect($conversation->fresh()->agent_last_seen_at)->not->toBeNull()
            ->and($conversation->fresh()->assignee_last_seen_at)->toBeNull();
    });

    it('throttles updates within an hour when there are no unread messages', function () {
        $fixtures = conversationApiFixtures();
        [$account, $inbox] = $fixtures;
        $agent = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id]);
        $conversation = conversationApiConversation($fixtures, ['agent_last_seen_at' => now()->subMinutes(30)]);
        Message::factory()->create([
            'account_id' => $account->id,
            'conversation_id' => $conversation->id,
            'created_at' => now()->subHour(),
        ]);
        $lastSeenBefore = $conversation->fresh()->agent_last_seen_at;

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/update_last_seen")
            ->assertNoContent();

        expect($conversation->fresh()->agent_last_seen_at->equalTo($lastSeenBefore))->toBeTrue();
    });

    it('updates within an hour when there are unread messages', function () {
        $fixtures = conversationApiFixtures();
        [$account, $inbox] = $fixtures;
        $agent = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id]);
        $conversation = conversationApiConversation($fixtures, ['agent_last_seen_at' => now()->subMinutes(30)]);
        Message::factory()->create([
            'account_id' => $account->id,
            'conversation_id' => $conversation->id,
            'created_at' => now()->subMinutes(5),
        ]);
        $lastSeenBefore = $conversation->fresh()->agent_last_seen_at;

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/update_last_seen")
            ->assertNoContent();

        expect($conversation->fresh()->agent_last_seen_at->greaterThan($lastSeenBefore))->toBeTrue();
    });

    it('updates both timestamps when only one of them is stale', function () {
        $fixtures = conversationApiFixtures();
        [$account, $inbox] = $fixtures;
        $agent = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id]);
        $conversation = conversationApiConversation($fixtures, [
            'assignee_id' => $agent->id,
            'agent_last_seen_at' => now()->subHours(2),
            'assignee_last_seen_at' => now()->subMinutes(30),
        ]);
        Message::factory()->create([
            'account_id' => $account->id,
            'conversation_id' => $conversation->id,
            'created_at' => now()->subHours(3),
        ]);
        $agentSeenBefore = $conversation->fresh()->agent_last_seen_at;

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/update_last_seen")
            ->assertNoContent();

        $refreshed = $conversation->fresh();
        expect($refreshed->agent_last_seen_at->greaterThan($agentSeenBefore))->toBeTrue()
            ->and($refreshed->assignee_last_seen_at->greaterThan($agentSeenBefore))->toBeTrue();
    });

    it('throttles when both timestamps are recent and nothing is unread', function () {
        $fixtures = conversationApiFixtures();
        [$account, $inbox] = $fixtures;
        $agent = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id]);
        $conversation = conversationApiConversation($fixtures, [
            'assignee_id' => $agent->id,
            'agent_last_seen_at' => now()->subMinutes(30),
            'assignee_last_seen_at' => now()->subMinutes(30),
        ]);
        Message::factory()->create([
            'account_id' => $account->id,
            'conversation_id' => $conversation->id,
            'created_at' => now()->subHour(),
        ]);
        $before = $conversation->fresh();

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/update_last_seen")
            ->assertNoContent();

        $refreshed = $conversation->fresh();
        expect($refreshed->agent_last_seen_at->equalTo($before->agent_last_seen_at))->toBeTrue()
            ->and($refreshed->assignee_last_seen_at->equalTo($before->assignee_last_seen_at))->toBeTrue();
    });

    it('clears the unread badge of the conversation payload', function () {
        $fixtures = conversationApiFixtures();
        [$account, $inbox] = $fixtures;
        $agent = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id]);
        $conversation = conversationApiConversation($fixtures, ['agent_last_seen_at' => null]);
        Message::factory()->count(2)->create([
            'account_id' => $account->id,
            'conversation_id' => $conversation->id,
        ]);

        $before = $this->actingAs($agent)
            ->getJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}")
            ->assertOk();
        expect($before->json('unread_count'))->toBe(2);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/update_last_seen")
            ->assertNoContent();

        $after = $this->actingAs($agent)
            ->getJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}")
            ->assertOk();
        expect($after->json('unread_count'))->toBe(0);
    });

    it('stays silent about unread counts when the feature is disabled', function () {
        $fixtures = conversationApiFixtures();
        [$account, $inbox] = $fixtures;
        $agent = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id]);
        $conversation = conversationApiConversation($fixtures, ['agent_last_seen_at' => null]);
        Event::fake([DomainEvent::class]);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/update_last_seen")
            ->assertNoContent();

        Event::assertNotDispatched(
            DomainEvent::class,
            fn (DomainEvent $event) => $event->type === EventType::CONVERSATION_UNREAD_COUNT_CHANGED
        );
    });

    it('notifies clients about the unread count when the feature is enabled', function () {
        $fixtures = conversationApiFixtures();
        [$account, $inbox] = $fixtures;
        $account->forceFill(['feature_flags' => ['conversation_unread_counts' => true]])->save();
        $agent = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id]);
        $conversation = conversationApiConversation($fixtures, ['agent_last_seen_at' => null]);
        Event::fake([DomainEvent::class]);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/update_last_seen")
            ->assertNoContent();

        Event::assertDispatched(
            DomainEvent::class,
            fn (DomainEvent $event) => $event->type === EventType::CONVERSATION_UNREAD_COUNT_CHANGED
                && $event->data['conversation']->id === $conversation->id
        );
    });
});

describe('POST /api/v1/accounts/{id}/conversations/{id}/unread', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $fixtures = conversationApiFixtures();
        [$account] = $fixtures;
        $conversation = conversationApiConversation($fixtures);

        $this->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/unread")
            ->assertUnauthorized();
    });

    it('rewinds both last seen marks to one second before the last incoming message', function () {
        $fixtures = conversationApiFixtures();
        [$account, $inbox] = $fixtures;
        $agent = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id]);
        $conversation = conversationApiConversation($fixtures, [
            'agent_last_seen_at' => now()->addMinute(),
            'assignee_last_seen_at' => now()->addMinute(),
        ]);
        $incoming = Message::factory()->create([
            'account_id' => $account->id,
            'conversation_id' => $conversation->id,
            'content' => 'Hello',
        ]);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/unread")
            ->assertNoContent();

        $expected = $incoming->fresh()->created_at->copy()->subSecond();
        $refreshed = $conversation->fresh();
        expect($refreshed->agent_last_seen_at->equalTo($expected))->toBeTrue()
            ->and($refreshed->assignee_last_seen_at->equalTo($expected))->toBeTrue()
            ->and($refreshed->unreadIncomingMessagesCount())->toBe(1);
    });

    it('clears both marks when there is no incoming message at all', function () {
        $fixtures = conversationApiFixtures();
        [$account, $inbox] = $fixtures;
        $agent = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id]);
        $conversation = conversationApiConversation($fixtures, [
            'agent_last_seen_at' => now(),
            'assignee_last_seen_at' => now(),
        ]);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/unread")
            ->assertNoContent();

        $refreshed = $conversation->fresh();
        expect($refreshed->agent_last_seen_at)->toBeNull()
            ->and($refreshed->assignee_last_seen_at)->toBeNull();
    });
});

describe('GET /api/v1/accounts/{id}/conversations/unread_counts', function () {
    it('returns unauthorized for unauthenticated user', function () {
        $account = Account::factory()->create();

        $this->getJson("/api/v1/accounts/{$account->id}/conversations/unread_counts")->assertUnauthorized();
    });

    it('returns forbidden when the account has the feature disabled', function () {
        $fixtures = conversationApiFixtures();
        [$account] = $fixtures;
        $agent = conversationApiUserOf($account);

        $this->actingAs($agent)
            ->getJson("/api/v1/accounts/{$account->id}/conversations/unread_counts")
            ->assertForbidden()
            ->assertJson(['error' => 'Conversation unread counts feature not enabled for this account']);
    });

    it('counts unread conversations per inbox, sidebar label and team of the caller', function () {
        $fixtures = conversationApiFixtures();
        [$account, $visibleInbox] = $fixtures;
        $account->forceFill(['feature_flags' => ['conversation_unread_counts' => true]])->save();
        $hiddenInbox = Inbox::factory()->create(['account_id' => $account->id]);
        $agent = conversationApiUserOf($account);
        $visibleInbox->addMembers([$agent->id]);
        $team = Team::factory()->create(['account_id' => $account->id]);
        $team->addMembers([$agent->id]);
        $label = Label::factory()->create(['account_id' => $account->id, 'title' => 'billing']);

        $visible = conversationApiConversation($fixtures, ['agent_last_seen_at' => null, 'team_id' => $team->id]);
        $visible->updateLabels([$label->title]);
        Message::factory()->create(['account_id' => $account->id, 'conversation_id' => $visible->id]);

        $hidden = Conversation::factory()->create(['account_id' => $account->id, 'inbox_id' => $hiddenInbox->id]);
        Message::factory()->create(['account_id' => $account->id, 'conversation_id' => $hidden->id]);

        $response = $this->actingAs($agent)
            ->getJson("/api/v1/accounts/{$account->id}/conversations/unread_counts")
            ->assertOk();

        expect($response->json('payload'))->toBe([
            'all_count' => 1,
            'inboxes' => [(string) $visibleInbox->id => 1],
            'labels' => [(string) $label->id => 1],
            'teams' => [(string) $team->id => 1],
        ]);
    });

    it('ignores read, resolved and label-off-sidebar conversations', function () {
        $fixtures = conversationApiFixtures();
        [$account, $inbox] = $fixtures;
        $account->forceFill(['feature_flags' => ['conversation_unread_counts' => true]])->save();
        $agent = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id]);
        $hiddenLabel = Label::factory()->create([
            'account_id' => $account->id,
            'title' => 'internal',
            'show_on_sidebar' => false,
        ]);

        $read = conversationApiConversation($fixtures, ['agent_last_seen_at' => now()->addMinute()]);
        Message::factory()->create(['account_id' => $account->id, 'conversation_id' => $read->id]);

        $labelled = conversationApiConversation($fixtures, ['agent_last_seen_at' => null]);
        $labelled->updateLabels([$hiddenLabel->title]);
        Message::factory()->create(['account_id' => $account->id, 'conversation_id' => $labelled->id]);

        $resolved = conversationApiConversation($fixtures, ['agent_last_seen_at' => null]);
        Message::factory()->create(['account_id' => $account->id, 'conversation_id' => $resolved->id]);
        $resolved->update(['status' => Conversation::STATUS_RESOLVED]);

        $response = $this->actingAs($agent)
            ->getJson("/api/v1/accounts/{$account->id}/conversations/unread_counts")
            ->assertOk();

        expect($response->json('payload'))->toBe([
            'all_count' => 1,
            'inboxes' => [(string) $inbox->id => 1],
            'labels' => [],
            'teams' => [],
        ]);
    });
});

describe('GET /api/v1/accounts/{id}/conversations with conversation_type', function () {
    it('returns unattended conversations only', function () {
        $fixtures = conversationApiFixtures();
        [$account, $inbox] = $fixtures;
        $agent = conversationApiUserOf($account);
        $inbox->addMembers([$agent->id]);

        $attended = conversationApiConversation($fixtures, ['first_reply_created_at' => now()]);
        // Trả lời của agent xoá waiting_since — đó là thứ làm hội thoại "đã xử lý".
        Message::factory()->outgoing()->create([
            'account_id' => $account->id,
            'conversation_id' => $attended->id,
            'sender_type' => 'User',
            'sender_id' => $agent->id,
        ]);
        conversationApiConversation($fixtures, ['first_reply_created_at' => null]);
        conversationApiConversation($fixtures, ['first_reply_created_at' => now()]);

        $response = $this->actingAs($agent)
            ->getJson("/api/v1/accounts/{$account->id}/conversations?conversation_type=unattended")
            ->assertOk();

        expect($response->json('data.meta.all_count'))->toBe(2)
            ->and($response->json('data.payload'))->toHaveCount(2)
            ->and(collect($response->json('data.payload'))->pluck('id'))->not->toContain($attended->display_id);
    });
});
