<?php

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Http\Resources\ContactResource;
use App\Http\Resources\ConversationResource;
use App\Http\Resources\MessageResource;
use App\Http\Resources\UserResource;
use App\Jobs\ActionCableBroadcastJob;
use App\Listeners\ActionCableListener;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;
use Illuminate\Support\Facades\Queue;

// Port từ spec/listeners/action_cable_listener_spec.rb.
// Bỏ: agent bot typing (EE). Nhánh notification_* nằm ở ActionCableNotificationTest.

function listenerSetup(): array
{
    $account = Account::factory()->create();
    $admin = User::factory()->create();
    AccountUser::factory()->administrator()->create(['account_id' => $account->id, 'user_id' => $admin->id]);
    $agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $agent->id]);
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);
    $inbox->addMembers([$agent->id]);
    $conversation = Conversation::factory()->create([
        'account_id' => $account->id,
        'inbox_id' => $inbox->id,
        'assignee_id' => $agent->id,
    ]);
    // Model hook đã bắn event khi seed — chỉ đếm job từ lúc test gọi fire().
    Queue::fake();

    return [$account, $admin, $agent, $inbox, $conversation];
}

function pushedBroadcast(): ActionCableBroadcastJob
{
    $jobs = Queue::pushedJobs()[ActionCableBroadcastJob::class] ?? [];

    expect($jobs)->toHaveCount(1);

    return $jobs[0]['job'];
}

function fire(EventType $type, array $data): void
{
    app(ActionCableListener::class)->handle(new DomainEvent($type, $data));
}

describe('account_cache_invalidated', function () {
    it('sends cache invalidation to account agents and admins', function () {
        [$account, $admin, $agent] = listenerSetup();

        fire(EventType::ACCOUNT_CACHE_INVALIDATED, ['account' => $account, 'cache_keys' => ['label' => 1]]);

        $job = pushedBroadcast();
        expect($job->members)->toEqualCanonicalizing([$agent->pubsub_token, $admin->pubsub_token])
            ->and($job->eventName)->toBe('account.cache_invalidated')
            ->and($job->data)->toBe(['cache_keys' => ['label' => 1], 'account_id' => $account->id])
            ->and($job->queue)->toBe('critical');
    });
});

describe('message_created', function () {
    it('sends message to account admins, inbox agents and the contact', function () {
        [$account, $admin, $agent, $inbox, $conversation] = listenerSetup();
        $message = Message::factory()->outgoing()->create([
            'account_id' => $account->id, 'inbox_id' => $inbox->id, 'conversation_id' => $conversation->id,
        ]);
        Queue::fake();

        fire(EventType::MESSAGE_CREATED, ['message' => $message]);

        $job = pushedBroadcast();
        expect($job->members)->toEqualCanonicalizing([
            $agent->pubsub_token, $admin->pubsub_token, $conversation->contactInbox->pubsub_token,
        ])
            ->and($job->eventName)->toBe('message.created')
            ->and($job->data)->toEqual([...MessageResource::pushEventData($message), 'account_id' => $account->id]);
    });

    it('sends message to all hmac verified contact inboxes', function () {
        [$account, $admin, $agent, $inbox, $conversation] = listenerSetup();
        $message = Message::factory()->outgoing()->create([
            'account_id' => $account->id, 'inbox_id' => $inbox->id, 'conversation_id' => $conversation->id,
        ]);
        $conversation->contactInbox->update(['hmac_verified' => true]);
        ContactInbox::factory()->create(['contact_id' => $conversation->contact_id, 'inbox_id' => $inbox->id]);
        $verified = ContactInbox::factory()->create([
            'contact_id' => $conversation->contact_id, 'inbox_id' => $inbox->id, 'hmac_verified' => true,
        ]);
        Queue::fake();

        fire(EventType::MESSAGE_CREATED, ['message' => $message->fresh()]);

        expect(pushedBroadcast()->members)->toEqualCanonicalizing([
            $agent->pubsub_token, $admin->pubsub_token, $conversation->contactInbox->pubsub_token, $verified->pubsub_token,
        ]);
    });

    it('does not send private or activity messages to the contact', function () {
        [$account, $admin, $agent, $inbox, $conversation] = listenerSetup();
        $message = Message::factory()->outgoing()->create([
            'account_id' => $account->id, 'inbox_id' => $inbox->id, 'conversation_id' => $conversation->id, 'private' => true,
        ]);
        Queue::fake();

        fire(EventType::MESSAGE_CREATED, ['message' => $message]);

        expect(pushedBroadcast()->members)->toEqualCanonicalizing([$agent->pubsub_token, $admin->pubsub_token]);
    });

    it('adds the performer when a user is logged in', function () {
        [$account, $admin, $agent, $inbox, $conversation] = listenerSetup();
        $message = Message::factory()->outgoing()->create([
            'account_id' => $account->id, 'inbox_id' => $inbox->id, 'conversation_id' => $conversation->id,
        ]);
        Queue::fake();
        $this->actingAs($agent);

        fire(EventType::MESSAGE_CREATED, ['message' => $message]);

        expect(pushedBroadcast()->data['performer'])->toEqual(UserResource::pushEventData($agent, $account));
    });
});

describe('message_updated', function () {
    it('merges previous_changes into the payload', function () {
        [$account, , , $inbox, $conversation] = listenerSetup();
        $message = Message::factory()->outgoing()->create([
            'account_id' => $account->id, 'inbox_id' => $inbox->id, 'conversation_id' => $conversation->id,
        ]);
        Queue::fake();

        fire(EventType::MESSAGE_UPDATED, ['message' => $message, 'previous_changes' => ['content' => ['a', 'b']]]);

        $job = pushedBroadcast();
        expect($job->eventName)->toBe('message.updated')
            ->and($job->data['previous_changes'])->toBe(['content' => ['a', 'b']]);
    });
});

describe('typing_on', function () {
    it('sends typing to admins and the contact, not the typing agent', function () {
        [$account, $admin, $agent, , $conversation] = listenerSetup();

        fire(EventType::CONVERSATION_TYPING_ON, ['conversation' => $conversation, 'user' => $agent, 'is_private' => false]);

        $job = pushedBroadcast();
        expect($job->members)->toEqualCanonicalizing([$admin->pubsub_token, $conversation->contactInbox->pubsub_token])
            ->and($job->eventName)->toBe('conversation.typing_on')
            ->and($job->data)->toEqual([
                'conversation' => ConversationResource::pushEventData($conversation),
                'user' => UserResource::pushEventData($agent, $account),
                'is_private' => false,
                'account_id' => $account->id,
            ]);
    });

    it('sends typing from the contact to admins and inbox agents only', function () {
        [$account, $admin, $agent, , $conversation] = listenerSetup();

        fire(EventType::CONVERSATION_TYPING_ON, ['conversation' => $conversation, 'user' => $conversation->contact, 'is_private' => false]);

        $job = pushedBroadcast();
        expect($job->members)->toEqualCanonicalizing([$admin->pubsub_token, $agent->pubsub_token])
            ->and($job->data['user'])->toEqual(ContactResource::pushEventData($conversation->contact));
    });
});

describe('typing_off', function () {
    it('sends typing off to admins and the contact', function () {
        [$account, $admin, $agent, , $conversation] = listenerSetup();

        fire(EventType::CONVERSATION_TYPING_OFF, ['conversation' => $conversation, 'user' => $agent, 'is_private' => false]);

        $job = pushedBroadcast();
        expect($job->members)->toEqualCanonicalizing([$admin->pubsub_token, $conversation->contactInbox->pubsub_token])
            ->and($job->eventName)->toBe('conversation.typing_off');
    });
});

describe('contact events', function () {
    it('contact_deleted sends the serialized data to the account channel', function () {
        [$account] = listenerSetup();
        $contact = Contact::factory()->create(['account_id' => $account->id]);
        $contactData = [...ContactResource::pushEventData($contact), 'account_id' => $account->id];
        Queue::fake();

        fire(EventType::CONTACT_DELETED, ['contact_data' => $contactData]);

        $job = pushedBroadcast();
        expect($job->members)->toBe(["account_{$account->id}"])
            ->and($job->eventName)->toBe('contact.deleted')
            ->and($job->data)->toEqual($contactData);
    });

    it('contact_created and contact_updated broadcast to the account channel', function () {
        [$account] = listenerSetup();
        $contact = Contact::factory()->create(['account_id' => $account->id]);
        Queue::fake();

        fire(EventType::CONTACT_CREATED, ['contact' => $contact]);
        fire(EventType::CONTACT_UPDATED, ['contact' => $contact, 'changed_attributes' => []]);

        Queue::assertPushed(ActionCableBroadcastJob::class, 2);
        Queue::assertPushed(ActionCableBroadcastJob::class, fn (ActionCableBroadcastJob $job) => $job->eventName === 'contact.created'
            && $job->members === ["account_{$account->id}"]
            && $job->data === [...ContactResource::pushEventData($contact), 'account_id' => $account->id]);
        Queue::assertPushed(ActionCableBroadcastJob::class, fn (ActionCableBroadcastJob $job) => $job->eventName === 'contact.updated');
    });
});

describe('conversation_updated', function () {
    it('sends update to inbox members and the contact', function () {
        [$account, $admin, $agent, , $conversation] = listenerSetup();

        fire(EventType::CONVERSATION_UPDATED, ['conversation' => $conversation, 'user' => $agent, 'is_private' => false]);

        $job = pushedBroadcast();
        expect($job->members)->toBe([$agent->pubsub_token, $admin->pubsub_token, $conversation->contactInbox->pubsub_token])
            ->and($job->eventName)->toBe('conversation.updated')
            ->and($job->data)->toEqual([...ConversationResource::pushEventData($conversation), 'account_id' => $account->id]);
    });

    it('conversation_created, assignee_changed and conversation_mentioned pick the right audience', function () {
        [$account, $admin, $agent, , $conversation] = listenerSetup();

        fire(EventType::CONVERSATION_CREATED, ['conversation' => $conversation]);
        fire(EventType::ASSIGNEE_CHANGED, ['conversation' => $conversation]);
        fire(EventType::CONVERSATION_MENTIONED, ['conversation' => $conversation, 'user' => $agent]);

        Queue::assertPushed(ActionCableBroadcastJob::class, fn (ActionCableBroadcastJob $job) => $job->eventName === 'conversation.created'
            && $job->members === [$agent->pubsub_token, $admin->pubsub_token, $conversation->contactInbox->pubsub_token]);
        Queue::assertPushed(ActionCableBroadcastJob::class, fn (ActionCableBroadcastJob $job) => $job->eventName === 'assignee.changed'
            && $job->members === [$agent->pubsub_token, $admin->pubsub_token]);
        Queue::assertPushed(ActionCableBroadcastJob::class, fn (ActionCableBroadcastJob $job) => $job->eventName === 'conversation.mentioned'
            && $job->members === [$agent->pubsub_token]);
    });
});

describe('dispatch wiring', function () {
    it('listens to DomainEvent and ignores events without a handler', function () {
        [$account] = listenerSetup();
        $contact = Contact::factory()->create(['account_id' => $account->id]);
        Queue::fake();

        DomainEvent::dispatch(EventType::CONTACT_CREATED, ['contact' => $contact]);
        DomainEvent::dispatch(EventType::INBOX_CREATED, ['inbox' => null]);

        Queue::assertPushed(ActionCableBroadcastJob::class, 1);
    });
});

describe('conversation_unread_count_changed', function () {
    it('signals inbox members with an empty payload when the feature is enabled', function () {
        [$account, $admin, $agent, , $conversation] = listenerSetup();
        $account->forceFill(['feature_flags' => ['conversation_unread_counts' => true]])->save();

        fire(EventType::CONVERSATION_UNREAD_COUNT_CHANGED, ['conversation' => $conversation->fresh()]);

        $job = pushedBroadcast();
        expect($job->members)->toEqualCanonicalizing([$agent->pubsub_token, $admin->pubsub_token])
            ->and($job->eventName)->toBe('conversation.unread_count_changed')
            ->and($job->data)->toBe(['account_id' => $account->id]);
    });

    it('stays silent when the account has the feature disabled', function () {
        [, , , , $conversation] = listenerSetup();

        fire(EventType::CONVERSATION_UNREAD_COUNT_CHANGED, ['conversation' => $conversation]);

        Queue::assertNothingPushed();
    });
});
