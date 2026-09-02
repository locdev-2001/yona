<?php

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Exceptions\MessageValidationException;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Support\Facades\Event;

// Port từ spec/models/message_spec.rb.
// Bỏ ở B3: dispatcher events + HookExecutionService/SendReplyJob (B4/D4/D6),
// attachments + webhook_data (B9/D4), email notifiable + conversation continuity
// (F1), source_id length + in_reply_to (đi cùng driver kênh email/social),
// mute chặn reopen (Redis — B4), agent bot pending/captain (D4/EE), csat survey
// content (C5), searchkick/should_index (EE), outgoing_content presenter (F1).

function messageConversation(): Conversation
{
    return Conversation::factory()->create();
}

function messageAttributesFor(Conversation $conversation): array
{
    return [
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'conversation_id' => $conversation->id,
    ];
}

function messageAgent(): User
{
    return User::factory()->create();
}

describe('length validations', function () {
    it('is valid when content is within limit', function () {
        $conversation = messageConversation();
        $message = Message::factory()->create([
            ...messageAttributesFor($conversation),
            'content' => str_repeat('a', 120000),
        ]);

        expect($message->exists)->toBeTrue();
    });

    it('throws when content crosses the limit', function () {
        $conversation = messageConversation();

        expect(fn () => Message::factory()->create([
            ...messageAttributesFor($conversation),
            'content' => str_repeat('a', 150001),
        ]))->toThrow(MessageValidationException::class, 'Content is too long (maximum is 150000 characters)');
    });

    it('adds error in case of message flooding', function () {
        config()->set('limits.conversation_message_per_minute', 2);
        $conversation = messageConversation();
        Message::factory()->count(2)->create(messageAttributesFor($conversation));

        expect(fn () => Message::factory()->create(messageAttributesFor($conversation)))
            ->toThrow(MessageValidationException::class, 'Too many messages');
    });
});

describe('when content_type is blank', function () {
    it('sets content_type as text', function () {
        $conversation = messageConversation();
        $message = Message::factory()->create([...messageAttributesFor($conversation), 'content_type' => null]);

        expect($message->contentTypeName())->toBe('text');
    });
});

describe('processed_message_content', function () {
    it('falls back to the message content', function () {
        $conversation = messageConversation();
        $message = Message::factory()->create([
            ...messageAttributesFor($conversation),
            'content' => 'Processed message content',
        ]);

        expect($message->processed_message_content)->toBe($message->content);
    });

    it('uses the quoted email text content when present', function () {
        $conversation = messageConversation();
        $message = Message::factory()->create([
            ...messageAttributesFor($conversation),
            'content' => 'Full content',
            'content_attributes' => ['email' => ['text_content' => ['quoted' => 'Quoted reply only']]],
        ]);

        expect($message->processed_message_content)->toBe('Quoted reply only');
    });
});

describe('reopen conversation', function () {
    it('reopens resolved conversation when the message is from a contact', function () {
        $conversation = messageConversation();
        $conversation->update(['status' => Conversation::STATUS_RESOLVED]);

        Message::factory()->create(messageAttributesFor($conversation));

        expect($conversation->fresh()->isOpen())->toBeTrue();
    });

    it('reopens snoozed conversation when the message is from a contact', function () {
        $conversation = messageConversation();
        $conversation->update(['status' => Conversation::STATUS_SNOOZED]);

        Message::factory()->create(messageAttributesFor($conversation));

        expect($conversation->fresh()->isOpen())->toBeTrue();
    });

    it('does not reopen for outgoing messages', function () {
        $conversation = messageConversation();
        $conversation->update(['status' => Conversation::STATUS_RESOLVED]);

        Message::factory()->outgoing()->create(messageAttributesFor($conversation));

        expect($conversation->fresh()->isResolved())->toBeTrue();
    });
});

describe('when message is created', function () {
    it('updates conversation last_activity_at when created', function () {
        $conversation = messageConversation();
        $message = Message::factory()->create([
            ...messageAttributesFor($conversation),
            'created_at' => now()->addHour(),
        ]);

        expect($conversation->fresh()->last_activity_at->getTimestamp())->toBe($message->created_at->getTimestamp());
    });

    it('updates contact last_activity_at when created', function () {
        $conversation = messageConversation();
        $contact = Contact::factory()->create(['account_id' => $conversation->account_id]);

        expect($contact->last_activity_at)->toBeNull();

        Message::factory()->create([
            ...messageAttributesFor($conversation),
            'sender_type' => 'Contact',
            'sender_id' => $contact->id,
        ]);

        expect($contact->fresh()->last_activity_at)->not->toBeNull();
    });
});

describe('message create event', function () {
    it('updates the conversation first reply created at if it is the first outgoing message', function () {
        $conversation = messageConversation()->fresh();
        $agent = messageAgent();

        expect($conversation->first_reply_created_at)->toBeNull()
            ->and($conversation->waiting_since->equalTo($conversation->created_at))->toBeTrue();

        $outgoingMessage = Message::factory()->outgoing()->create([
            ...messageAttributesFor($conversation),
            'sender_type' => 'User',
            'sender_id' => $agent->id,
        ]);

        $conversation->refresh();
        expect($conversation->first_reply_created_at->getTimestamp())->toBe($outgoingMessage->created_at->getTimestamp())
            ->and($conversation->waiting_since)->toBeNull();
    });

    it('does not update the conversation first reply created at if the message is incoming', function () {
        $conversation = messageConversation()->fresh();

        Message::factory()->create(messageAttributesFor($conversation));

        $conversation->refresh();
        expect($conversation->first_reply_created_at)->toBeNull()
            ->and($conversation->waiting_since->equalTo($conversation->created_at))->toBeTrue();
    });

    it('does not update the conversation first reply created at if the message is template', function () {
        $conversation = messageConversation()->fresh();

        Message::factory()->create([
            ...messageAttributesFor($conversation),
            'message_type' => Message::TYPE_TEMPLATE,
        ]);

        $conversation->refresh();
        expect($conversation->first_reply_created_at)->toBeNull()
            ->and($conversation->waiting_since->equalTo($conversation->created_at))->toBeTrue();
    });

    it('does not update the conversation first reply created at if the message is activity', function () {
        $conversation = messageConversation()->fresh();

        Message::factory()->activity()->create(messageAttributesFor($conversation));

        $conversation->refresh();
        expect($conversation->first_reply_created_at)->toBeNull()
            ->and($conversation->waiting_since->equalTo($conversation->created_at))->toBeTrue();
    });

    it('does not update the conversation first reply created at if the message is a private message', function () {
        $conversation = messageConversation()->fresh();
        $agent = messageAgent();
        $senderAttributes = ['sender_type' => 'User', 'sender_id' => $agent->id];

        Message::factory()->outgoing()->create([
            ...messageAttributesFor($conversation),
            ...$senderAttributes,
            'private' => true,
        ]);

        $conversation->refresh();
        expect($conversation->first_reply_created_at)->toBeNull()
            ->and($conversation->waiting_since->equalTo($conversation->created_at))->toBeTrue();

        $nextMessage = Message::factory()->outgoing()->create([
            ...messageAttributesFor($conversation),
            ...$senderAttributes,
        ]);

        $conversation->refresh();
        expect($conversation->first_reply_created_at->getTimestamp())->toBe($nextMessage->created_at->getTimestamp())
            ->and($conversation->waiting_since)->toBeNull();
    });

    it('does not update first reply if the message is sent as campaign', function () {
        $conversation = messageConversation()->fresh();
        $agent = messageAgent();

        Message::factory()->outgoing()->create([
            ...messageAttributesFor($conversation),
            'sender_type' => 'User',
            'sender_id' => $agent->id,
            'additional_attributes' => ['campaign_id' => 1],
        ]);

        $conversation->refresh();
        expect($conversation->first_reply_created_at)->toBeNull()
            ->and($conversation->waiting_since->equalTo($conversation->created_at))->toBeTrue();
    });

    it('does not update first reply if the message is sent by automation', function () {
        $conversation = messageConversation()->fresh();
        $agent = messageAgent();

        Message::factory()->outgoing()->create([
            ...messageAttributesFor($conversation),
            'sender_type' => 'User',
            'sender_id' => $agent->id,
            'content_attributes' => ['automation_rule_id' => 1],
        ]);

        $conversation->refresh();
        expect($conversation->first_reply_created_at)->toBeNull()
            ->and($conversation->waiting_since->equalTo($conversation->created_at))->toBeTrue();
    });
});

describe('waiting since', function () {
    it('resets the waiting_since if an agent sent a reply', function () {
        $conversation = messageConversation();
        $agent = messageAgent();

        Message::factory()->outgoing()->create([
            ...messageAttributesFor($conversation),
            'sender_type' => 'User',
            'sender_id' => $agent->id,
        ]);

        expect($conversation->fresh()->waiting_since)->toBeNull();
    });

    it('sets the waiting_since if there is an incoming message', function () {
        $conversation = messageConversation();
        $conversation->update(['waiting_since' => null]);

        Message::factory()->create(messageAttributesFor($conversation));

        expect($conversation->fresh()->waiting_since)->not->toBeNull();
    });

    it('does not overwrite the previous value if there are newer messages', function () {
        $conversation = messageConversation()->fresh();
        $oldWaitingSince = $conversation->waiting_since;

        Message::factory()->create(messageAttributesFor($conversation));

        expect($conversation->fresh()->waiting_since->equalTo($oldWaitingSince))->toBeTrue();
    });
});

describe('dispatch events', function () {
    beforeEach(function () {
        Event::fake([DomainEvent::class]);
    });

    it('dispatches message.created after create', function () {
        $conversation = messageConversation();

        $message = Message::factory()->create(messageAttributesFor($conversation));

        Event::assertDispatched(DomainEvent::class, fn (DomainEvent $event) => $event->type === EventType::MESSAGE_CREATED
            && $event->data['message']->is($message)
            && $event->data['performed_by'] === null);
        Event::assertNotDispatched(DomainEvent::class, fn (DomainEvent $event) => $event->type === EventType::FIRST_REPLY_CREATED);
    });

    it('dispatches first.reply.created for the first human outgoing message', function () {
        $conversation = messageConversation();
        $agent = messageAgent();
        $this->actingAs($agent);

        $message = Message::factory()->outgoing()->create([
            ...messageAttributesFor($conversation),
            'sender_type' => 'User',
            'sender_id' => $agent->id,
        ]);

        Event::assertDispatched(DomainEvent::class, fn (DomainEvent $event) => $event->type === EventType::FIRST_REPLY_CREATED
            && $event->data['message']->is($message)
            && $event->data['performed_by']->is($agent));
        expect($conversation->fresh()->first_reply_created_at->equalTo($message->created_at))->toBeTrue();
    });

    it('dispatches message.updated with previous_changes only when something changed', function () {
        $conversation = messageConversation();
        $message = Message::factory()->create(messageAttributesFor($conversation));

        $message->update(['content' => 'Message content']);
        Event::assertNotDispatched(DomainEvent::class, fn (DomainEvent $event) => $event->type === EventType::MESSAGE_UPDATED);

        $message->update(['content' => 'edited']);
        Event::assertDispatched(DomainEvent::class, fn (DomainEvent $event) => $event->type === EventType::MESSAGE_UPDATED
            && $event->data['message']->is($message)
            && $event->data['previous_changes']['content'] === ['Message content', 'edited']);
    });
});
