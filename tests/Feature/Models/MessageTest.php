<?php

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Exceptions\MessageValidationException;
use App\Http\Resources\MessageResource;
use App\Models\Attachment;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;

// Port từ spec/models/message_spec.rb.
// Bỏ: dispatcher events + HookExecutionService/SendReplyJob (B4/D4/D6),
// webhook_data (D4), email notifiable + conversation continuity
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

    it('treats an unknown stored content type as text instead of failing the whole conversation', function () {
        $conversation = messageConversation();
        $message = Message::factory()->create(messageAttributesFor($conversation));
        Message::query()->whereKey($message->id)->update(['content_type' => 999]);

        expect($message->fresh()->contentTypeName())->toBe('text');
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

    it('leaves conversation last_activity_at alone for an activity line, so an old conversation does not jump to the top', function () {
        $conversation = messageConversation()->fresh();
        $lastActivityAt = $conversation->last_activity_at->getTimestamp();

        Message::factory()->activity()->create([
            ...messageAttributesFor($conversation),
            'created_at' => now()->addHour(),
        ]);

        expect($conversation->fresh()->last_activity_at->getTimestamp())->toBe($lastActivityAt);
    });

    it('restarts conversation last_activity_at when the conversation is reopened', function () {
        $conversation = messageConversation();
        $conversation->update(['status' => Conversation::STATUS_RESOLVED, 'last_activity_at' => now()->subDays(3)]);

        $conversation->update(['status' => Conversation::STATUS_OPEN]);

        expect($conversation->fresh()->last_activity_at->greaterThan(now()->subMinute()))->toBeTrue();
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

describe('attachments', function () {
    beforeEach(function () {
        Storage::fake('public');
    });

    it('carries the attachments in push_event_data', function () {
        $conversation = messageConversation();
        $message = Message::factory()->create(messageAttributesFor($conversation));
        $message->attachments()->create(
            Attachment::storeUpload(UploadedFile::fake()->image('avatar.png'), $message->account_id)
        );

        $data = MessageResource::pushEventData($message->fresh());

        expect($data['attachments'])->toHaveCount(1)
            ->and($data['attachments'][0]['message_id'])->toBe($message->id);
    });

    it('omits the attachments key when the message has none', function () {
        $conversation = messageConversation();
        $message = Message::factory()->create(messageAttributesFor($conversation));

        expect(MessageResource::pushEventData($message))->not->toHaveKey('attachments');
    });

    it('destroys the attachments and their files with the message', function () {
        $conversation = messageConversation();
        $message = Message::factory()->create(messageAttributesFor($conversation));
        $attachment = $message->attachments()->create(
            Attachment::storeUpload(UploadedFile::fake()->image('avatar.png'), $message->account_id)
        );

        $message->delete();

        expect(Attachment::query()->whereKey($attachment->id)->exists())->toBeFalse();
        Storage::disk('public')->assertMissing($attachment->path);
    });

    it('broadcasts a recalled message without the attachments it no longer has', function () {
        $conversation = messageConversation();
        $message = Message::factory()->create(messageAttributesFor($conversation));
        $message->attachments()->create(
            Attachment::storeUpload(UploadedFile::fake()->image('thu-hoi.png'), $message->account_id)
        );

        $payloads = [];
        Event::listen(DomainEvent::class, function (DomainEvent $event) use (&$payloads) {
            if ($event->type === EventType::MESSAGE_UPDATED) {
                $payloads[] = MessageResource::pushEventData($event->data['message']);
            }
        });

        $message->fresh()->markDeleted('vi');

        expect($payloads)->toHaveCount(1)
            ->and($payloads[0]['content_attributes']['deleted'])->toBeTrue()
            ->and($payloads[0])->not->toHaveKey('attachments');
    });
});

describe('repliedMessage', function () {
    it('returns the replied message of the same conversation', function () {
        $conversation = messageConversation();
        $original = Message::factory()->create([...messageAttributesFor($conversation), 'source_id' => 'src-1']);
        $reply = Message::factory()->outgoing()->create([
            ...messageAttributesFor($conversation),
            'content_attributes' => ['in_reply_to' => $original->id],
        ]);

        expect($reply->repliedMessage()?->id)->toBe($original->id)
            ->and($reply->content_attributes['in_reply_to_external_id'])->toBe('src-1');
    });

    it('returns null when in_reply_to points to another conversation', function () {
        $conversation = messageConversation();
        $foreign = Message::factory()->create(messageAttributesFor(messageConversation()));
        $reply = Message::factory()->outgoing()->create(messageAttributesFor($conversation));

        // Gán thẳng trong bộ nhớ, không qua saving — mô phỏng dữ liệu cũ chưa chuẩn hoá.
        $reply->content_attributes = ['in_reply_to' => $foreign->id];

        expect($reply->repliedMessage())->toBeNull();
    });

    it('returns null when the replied message does not exist or is not set', function () {
        $conversation = messageConversation();
        $reply = Message::factory()->outgoing()->create(messageAttributesFor($conversation));

        expect($reply->repliedMessage())->toBeNull();

        $reply->content_attributes = ['in_reply_to' => 999999];

        expect($reply->repliedMessage())->toBeNull();
    });
});

describe('forwarded messages', function () {
    it('isForwarded chỉ đúng khi forwarded_from là object', function () {
        $conversation = messageConversation();
        $forwarded = Message::factory()->outgoing()->create([
            ...messageAttributesFor($conversation),
            'content_attributes' => ['forwarded_from' => ['origin' => 'internal', 'message_id' => 1, 'conversation_id' => 2]],
        ]);
        $plain = Message::factory()->outgoing()->create(messageAttributesFor($conversation));
        $plain->content_attributes = ['forwarded_from' => 'giả'];

        expect($forwarded->isForwarded())->toBeTrue()
            ->and($plain->isForwarded())->toBeFalse()
            ->and(Message::factory()->outgoing()->create(messageAttributesFor($conversation))->isForwarded())->toBeFalse();
    });

    it('tin đi mang dấu chuyển tiếp giữ nguyên văn chuỗi Liquid, tin thường vẫn render', function () {
        $conversation = messageConversation();
        $conversation->contact->update(['name' => 'Chị Lan']);

        $forwarded = Message::factory()->outgoing()->create([
            ...messageAttributesFor($conversation),
            'content' => 'Chào {{contact.name}}',
            'content_attributes' => ['forwarded_from' => ['origin' => 'internal', 'message_id' => 1, 'conversation_id' => 2]],
        ]);
        $plain = Message::factory()->outgoing()->create([
            ...messageAttributesFor($conversation),
            'content' => 'Chào {{contact.name}}',
        ]);

        expect($forwarded->content)->toBe('Chào {{contact.name}}')
            ->and($plain->content)->toBe('Chào Chị Lan');
    });
});
