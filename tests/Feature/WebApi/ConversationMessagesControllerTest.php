<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;

// Port từ spec/controllers/api/v1/accounts/conversations/messages_controller_spec.rb.
// Bỏ ở B3: attachments (B9), sender AgentBot + agent bot auth (D4), input_select/
// cards của bot (D4), activity message khi reopen (B5), update status/destroy/
// retry/translate (đi cùng driver kênh + B5/F6), lỗi query canceled (hạ tầng DB
// timeout chưa port).

function conversationMessagesFixtures(): array
{
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);
    $contact = Contact::factory()->create(['account_id' => $account->id]);
    $contactInbox = ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $inbox->id]);
    $conversation = Conversation::factory()->create([
        'account_id' => $account->id,
        'inbox_id' => $inbox->id,
        'contact_id' => $contact->id,
        'contact_inbox_id' => $contactInbox->id,
    ]);

    return [$account, $inbox, $contact, $conversation];
}

function conversationMessagesAgentOf(Account $account, Inbox $inbox): User
{
    $agent = User::factory()->create();
    AccountUser::factory()->create([
        'account_id' => $account->id,
        'user_id' => $agent->id,
        'role' => AccountUser::ROLE_AGENT,
    ]);
    $inbox->addMembers([$agent->id]);

    return $agent;
}

describe('GET /api/v1/accounts/{id}/conversations/{conversationId}/messages', function () {
    it('returns unauthorized for unauthenticated user', function () {
        [$account, , , $conversation] = conversationMessagesFixtures();

        $this->getJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages")
            ->assertUnauthorized();
    });

    it('shows the conversation messages with contact meta', function () {
        [$account, $inbox, $contact, $conversation] = conversationMessagesFixtures();
        $agent = conversationMessagesAgentOf($account, $inbox);
        $messageAttributes = [
            'account_id' => $account->id,
            'inbox_id' => $inbox->id,
            'conversation_id' => $conversation->id,
        ];
        $firstMessage = Message::factory()->create([...$messageAttributes, 'created_at' => now()->subMinute()]);
        $secondMessage = Message::factory()->outgoing()->create($messageAttributes);

        $response = $this->actingAs($agent)
            ->getJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages")
            ->assertOk();

        expect($response->json('meta.contact.id'))->toBe($contact->id)
            ->and(collect($response->json('payload'))->pluck('id')->all())
            ->toBe([$firstMessage->id, $secondMessage->id]);
    });
});

describe('POST /api/v1/accounts/{id}/conversations/{conversationId}/messages', function () {
    it('returns unauthorized for unauthenticated user', function () {
        [$account, , , $conversation] = conversationMessagesFixtures();

        $this->postJson(
            "/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages",
            ['content' => 'test-message']
        )->assertUnauthorized();
    });

    it('creates a new outgoing message with the user as sender', function () {
        [$account, $inbox, , $conversation] = conversationMessagesFixtures();
        $agent = conversationMessagesAgentOf($account, $inbox);

        $response = $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages", [
                'content' => 'test-message',
            ])
            ->assertOk();

        $message = $conversation->messages()->firstOrFail();

        expect($conversation->messages()->count())->toBe(1)
            ->and($message->content)->toBe('test-message')
            ->and($message->message_type)->toBe(Message::TYPE_OUTGOING)
            ->and($response->json('sender.id'))->toBe($agent->id)
            ->and($response->json('sender.type'))->toBe('user');
    });

    it('creates a private note', function () {
        [$account, $inbox, , $conversation] = conversationMessagesFixtures();
        $agent = conversationMessagesAgentOf($account, $inbox);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages", [
                'content' => 'internal note',
                'private' => true,
            ])
            ->assertOk()
            ->assertJsonPath('private', true);

        expect($conversation->messages()->firstOrFail()->private)->toBeTrue();
    });

    it('echoes back the echo_id when passed', function () {
        [$account, $inbox, , $conversation] = conversationMessagesFixtures();
        $agent = conversationMessagesAgentOf($account, $inbox);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages", [
                'content' => 'test-message',
                'echo_id' => 'echo-123',
            ])
            ->assertOk()
            ->assertJsonPath('echo_id', 'echo-123');
    });

    it('creates an incoming message via api_access_token on an api inbox', function () {
        [$account, $inbox, $contact, $conversation] = conversationMessagesFixtures();
        $admin = User::factory()->create();
        AccountUser::factory()->create([
            'account_id' => $account->id,
            'user_id' => $admin->id,
            'role' => AccountUser::ROLE_ADMINISTRATOR,
        ]);

        $this->postJson(
            "/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages",
            ['content' => 'test-message', 'message_type' => 'incoming'],
            ['api_access_token' => $admin->accessToken->token]
        )->assertOk();

        $message = $conversation->messages()->firstOrFail();

        expect($message->message_type)->toBe(Message::TYPE_INCOMING)
            ->and($message->sender_type)->toBe('Contact')
            ->and($message->sender_id)->toBe($contact->id);
    });

    it('reopens the resolved conversation with a new incoming message', function () {
        [$account, $inbox, , $conversation] = conversationMessagesFixtures();
        $agent = conversationMessagesAgentOf($account, $inbox);
        Message::factory()->create([
            'account_id' => $account->id,
            'inbox_id' => $inbox->id,
            'conversation_id' => $conversation->id,
        ]);
        $conversation->update(['status' => Conversation::STATUS_RESOLVED]);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages", [
                'content' => 'test-message',
                'private' => false,
                'message_type' => 'incoming',
            ])
            ->assertOk();

        expect($conversation->fresh()->statusName())->toBe('open');
    });

    it('does not create the message when content is too long', function () {
        [$account, $inbox, , $conversation] = conversationMessagesFixtures();
        $agent = conversationMessagesAgentOf($account, $inbox);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages", [
                'content' => str_repeat('h', 150000).'a',
                'private' => true,
            ])
            ->assertStatus(422)
            ->assertJson(['error' => 'Content is too long (maximum is 150000 characters)']);

        expect($conversation->messages()->count())->toBe(0);
    });

    it('returns an error when the conversation is flooded', function () {
        config()->set('limits.conversation_message_per_minute', 2);
        [$account, $inbox, , $conversation] = conversationMessagesFixtures();
        $agent = conversationMessagesAgentOf($account, $inbox);
        Message::factory()->count(2)->create([
            'account_id' => $account->id,
            'inbox_id' => $inbox->id,
            'conversation_id' => $conversation->id,
        ]);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages", [
                'content' => 'test-message',
            ])
            ->assertStatus(422)
            ->assertJson(['error' => 'Too many messages']);
    });
});
