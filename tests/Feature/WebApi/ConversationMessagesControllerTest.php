<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

// Port từ spec/controllers/api/v1/accounts/conversations/messages_controller_spec.rb.
// Bỏ: sender AgentBot + agent bot auth (D4), input_select/
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

describe('POST messages with attachments', function () {
    beforeEach(function () {
        Storage::fake('public');
    });

    it('creates a new outgoing message with an attachment', function () {
        [$account, $inbox, , $conversation] = conversationMessagesFixtures();
        $agent = conversationMessagesAgentOf($account, $inbox);

        $response = $this->actingAs($agent)
            ->post("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages", [
                'content' => 'test-message',
                'attachments' => [UploadedFile::fake()->image('avatar.png', 120, 80)],
            ], ['Accept' => 'application/json'])
            ->assertOk();

        $attachment = $conversation->messages()->firstOrFail()->attachments->first();

        expect($attachment)->not->toBeNull()
            ->and($attachment->fileTypeName())->toBe('image')
            ->and($response->json('attachments.0.file_type'))->toBe('image')
            ->and($response->json('attachments.0.extension'))->toBe('png')
            ->and($response->json('attachments.0.width'))->toBe(120)
            ->and($response->json('attachments.0.data_url'))->not->toBe('');
        Storage::disk('public')->assertExists($attachment->path);
    });

    it('creates a message carrying several attachments of mixed types', function () {
        [$account, $inbox, , $conversation] = conversationMessagesFixtures();
        $agent = conversationMessagesAgentOf($account, $inbox);

        $response = $this->actingAs($agent)
            ->post("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages", [
                'content' => 'test-message',
                'attachments' => [
                    UploadedFile::fake()->image('avatar.png'),
                    UploadedFile::fake()->create('doc.pdf', 2, 'application/pdf'),
                ],
            ], ['Accept' => 'application/json'])
            ->assertOk();

        expect($response->json('attachments'))->toHaveCount(2)
            ->and(array_column($response->json('attachments'), 'file_type'))->toBe(['image', 'file'])
            ->and($response->json('attachments.1.thumb_url'))->toBe('');
    });

    it('returns the attachments when listing messages', function () {
        [$account, $inbox, , $conversation] = conversationMessagesFixtures();
        $agent = conversationMessagesAgentOf($account, $inbox);

        $this->actingAs($agent)
            ->post("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages", [
                'content' => 'test-message',
                'attachments' => [UploadedFile::fake()->image('avatar.png')],
            ], ['Accept' => 'application/json'])
            ->assertOk();

        $response = $this->actingAs($agent)
            ->getJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages")
            ->assertOk();

        expect($response->json('payload.0.attachments'))->toHaveCount(1);
    });

    it('omits the attachments key for a message without files', function () {
        [$account, $inbox, , $conversation] = conversationMessagesFixtures();
        $agent = conversationMessagesAgentOf($account, $inbox);

        $response = $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages", [
                'content' => 'test-message',
            ])
            ->assertOk();

        expect($response->json())->not->toHaveKey('attachments');
    });

    it('returns 422 when more attachments than allowed are sent', function () {
        [$account, $inbox, , $conversation] = conversationMessagesFixtures();
        $agent = conversationMessagesAgentOf($account, $inbox);
        $files = array_map(
            fn (int $index) => UploadedFile::fake()->image("avatar-{$index}.png"),
            range(1, Message::NUMBER_OF_PERMITTED_ATTACHMENTS + 1),
        );

        $response = $this->actingAs($agent)
            ->post("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages", [
                'content' => 'test-message',
                'attachments' => $files,
            ], ['Accept' => 'application/json'])
            ->assertStatus(422);

        expect($response->json('error'))->toBe('Attachments exceeded maximum allowed')
            ->and($conversation->messages()->count())->toBe(0);
    });

    it('returns 422 for a file type the website widget does not accept', function () {
        [$account, $inbox, , $conversation] = conversationMessagesFixtures();
        $agent = conversationMessagesAgentOf($account, $inbox);
        Inbox::query()->whereKey($inbox->id)->update(['channel_type' => 'Channel::WebWidget']);

        $response = $this->actingAs($agent)
            ->post("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages", [
                'content' => 'test-message',
                'attachments' => [UploadedFile::fake()->create('script.sh', 1, 'application/x-sh')],
            ], ['Accept' => 'application/json'])
            ->assertStatus(422);

        expect($response->json('error'))->toBe('File type not supported')
            ->and($conversation->messages()->count())->toBe(0)
            ->and(Storage::disk('public')->allFiles())->toBe([]);
    });

    it('returns 422 for a file bigger than the limit on the website widget', function () {
        config(['limits.maximum_file_upload_size' => 1]);
        [$account, $inbox, , $conversation] = conversationMessagesFixtures();
        $agent = conversationMessagesAgentOf($account, $inbox);
        Inbox::query()->whereKey($inbox->id)->update(['channel_type' => 'Channel::WebWidget']);

        $response = $this->actingAs($agent)
            ->post("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages", [
                'content' => 'test-message',
                'attachments' => [UploadedFile::fake()->create('big.pdf', 2048, 'application/pdf')],
            ], ['Accept' => 'application/json'])
            ->assertStatus(422);

        expect($response->json('error'))->toBe('File size is too big')
            ->and($conversation->messages()->count())->toBe(0);
    });
});

describe('POST messages replying to a message', function () {
    it('keeps in_reply_to and derives the external id from the replied message', function () {
        [$account, $inbox, , $conversation] = conversationMessagesFixtures();
        $agent = conversationMessagesAgentOf($account, $inbox);
        $original = Message::factory()->create([
            'account_id' => $account->id,
            'inbox_id' => $inbox->id,
            'conversation_id' => $conversation->id,
            'source_id' => 'platform-msg-1',
        ]);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages", [
                'content' => 'Dạ còn ạ',
                'content_attributes' => ['in_reply_to' => $original->id],
            ])
            ->assertOk()
            ->assertJsonPath('content_attributes.in_reply_to', $original->id)
            ->assertJsonPath('content_attributes.in_reply_to_external_id', 'platform-msg-1');
    });

    it('keeps in_reply_to sent as a JSON string next to an attachment', function () {
        Storage::fake('public');
        [$account, $inbox, , $conversation] = conversationMessagesFixtures();
        $agent = conversationMessagesAgentOf($account, $inbox);
        $original = Message::factory()->create([
            'account_id' => $account->id,
            'inbox_id' => $inbox->id,
            'conversation_id' => $conversation->id,
        ]);

        $this->actingAs($agent)
            ->post("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages", [
                'content' => 'Ảnh mẫu đây ạ',
                'content_attributes' => json_encode(['in_reply_to' => $original->id]),
                'attachments' => [UploadedFile::fake()->image('mau.png')],
            ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('content_attributes.in_reply_to', $original->id);
    });

    it('drops in_reply_to that points to a message of another conversation', function () {
        [$account, $inbox, , $conversation] = conversationMessagesFixtures();
        $agent = conversationMessagesAgentOf($account, $inbox);
        [, , , $otherConversation] = conversationMessagesFixtures();
        $foreign = Message::factory()->create([
            'account_id' => $otherConversation->account_id,
            'inbox_id' => $otherConversation->inbox_id,
            'conversation_id' => $otherConversation->id,
            'source_id' => 'foreign-1',
        ]);

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages", [
                'content' => 'Dạ còn ạ',
                'content_attributes' => ['in_reply_to' => $foreign->id],
            ])
            ->assertOk()
            ->assertJsonPath('content_attributes.in_reply_to', null)
            ->assertJsonPath('content_attributes.in_reply_to_external_id', null);
    });
});

describe('POST messages with a forged forwarded_from', function () {
    it('bỏ forwarded_from do client gửi lên và vẫn render Liquid như tin thường', function () {
        [$account, $inbox, $contact, $conversation] = conversationMessagesFixtures();
        $contact->update(['name' => 'Chị Lan']);
        $agent = conversationMessagesAgentOf($account, $inbox);

        $response = $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/messages", [
                'content' => 'Chào {{contact.name}}',
                'content_attributes' => ['forwarded_from' => ['origin' => 'internal', 'message_id' => 1, 'conversation_id' => 2]],
            ])
            ->assertOk();

        expect($response->json('content_attributes'))->not->toHaveKey('forwarded_from')
            ->and($response->json('content'))->toBe('Chào Chị Lan')
            ->and($conversation->messages()->firstOrFail()->isForwarded())->toBeFalse();
    });
});
