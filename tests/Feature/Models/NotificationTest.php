<?php

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Event;

// Port từ spec/models/notification_spec.rb.

function makeNotificationRecord(array $attributes = []): Notification
{
    return Notification::factory()->create($attributes);
}

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->user = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->user->id]);
    $this->conversation = Conversation::factory()->create(['account_id' => $this->account->id]);
});

it('sets last_activity_at when the notification is created', function () {
    $notification = makeNotificationRecord([
        'account_id' => $this->account->id,
        'user_id' => $this->user->id,
        'primary_actor_id' => $this->conversation->id,
    ]);

    expect($notification->last_activity_at)->not->toBeNull();
});

describe('push_message_title', function () {
    it('names the inbox for conversation_creation', function () {
        $notification = makeNotificationRecord([
            'account_id' => $this->account->id,
            'user_id' => $this->user->id,
            'primary_actor_id' => $this->conversation->id,
            'notification_type' => Notification::typeValue('conversation_creation'),
        ]);

        expect($notification->pushMessageTitle())->toBe(
            "A conversation (#{$this->conversation->display_id}) has been created in {$this->conversation->inbox->name}"
        );
    });

    it('reads "assigned to you" for conversation_assignment', function () {
        $notification = makeNotificationRecord([
            'account_id' => $this->account->id,
            'user_id' => $this->user->id,
            'primary_actor_id' => $this->conversation->id,
            'notification_type' => Notification::typeValue('conversation_assignment'),
        ]);

        expect($notification->pushMessageTitle())->toBe(
            "A conversation (#{$this->conversation->display_id}) has been assigned to you"
        );
    });

    it('uses the assigned-message title for participating conversations too', function () {
        $notification = makeNotificationRecord([
            'account_id' => $this->account->id,
            'user_id' => $this->user->id,
            'primary_actor_id' => $this->conversation->id,
            'notification_type' => Notification::typeValue('participating_conversation_new_message'),
        ]);

        expect($notification->pushMessageTitle())->toBe(
            "A new message is created in conversation (#{$this->conversation->display_id})"
        );
    });

    it('reads "you have been mentioned" for conversation_mention', function () {
        $notification = makeNotificationRecord([
            'account_id' => $this->account->id,
            'user_id' => $this->user->id,
            'primary_actor_id' => $this->conversation->id,
            'notification_type' => Notification::typeValue('conversation_mention'),
        ]);

        expect($notification->pushMessageTitle())->toBe(
            "You have been mentioned in conversation (#{$this->conversation->display_id})"
        );
    });
});

describe('push_message_body', function () {
    it('shows the first message for conversation_creation', function () {
        $sender = User::factory()->create();
        $message = Message::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->conversation->inbox_id,
            'conversation_id' => $this->conversation->id,
            'content' => 'Xin chao doi ngu ho tro',
            'sender_type' => 'User',
            'sender_id' => $sender->id,
        ]);

        $notification = makeNotificationRecord([
            'account_id' => $this->account->id,
            'user_id' => $this->user->id,
            'primary_actor_id' => $this->conversation->id,
            'notification_type' => Notification::typeValue('conversation_creation'),
            'secondary_actor_type' => 'Message',
            'secondary_actor_id' => $message->id,
        ]);

        expect($notification->pushMessageBody())->toBe("{$sender->name}: Xin chao doi ngu ho tro");
    });

    it('flattens markdown mentions in the message body', function () {
        $sender = User::factory()->create();
        $message = Message::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->conversation->inbox_id,
            'conversation_id' => $this->conversation->id,
            'content' => 'Hey [@John](mention://user/1/john), [@Alisha Peter](mention://user/2/alisha) can you check this ticket?',
            'sender_type' => 'User',
            'sender_id' => $sender->id,
        ]);

        $notification = makeNotificationRecord([
            'account_id' => $this->account->id,
            'user_id' => $this->user->id,
            'primary_actor_id' => $this->conversation->id,
            'notification_type' => Notification::typeValue('participating_conversation_new_message'),
            'secondary_actor_type' => 'Message',
            'secondary_actor_id' => $message->id,
        ]);

        expect($notification->pushMessageBody())->toBe("{$sender->name}: Hey @John, @Alisha Peter can you check this ticket?");
    });

    it('keeps names with spaces and emoji intact', function () {
        $sender = User::factory()->create();
        $message = Message::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->conversation->inbox_id,
            'conversation_id' => $this->conversation->id,
            'content' => 'Please check [@🚀 Development Team](mention://team/2/%F0%9F%9A%80%20Development%20Team)',
            'sender_type' => 'User',
            'sender_id' => $sender->id,
        ]);

        $notification = makeNotificationRecord([
            'account_id' => $this->account->id,
            'user_id' => $this->user->id,
            'primary_actor_id' => $this->conversation->id,
            'notification_type' => Notification::typeValue('conversation_mention'),
            'secondary_actor_type' => 'Message',
            'secondary_actor_id' => $message->id,
        ]);

        expect($notification->pushMessageBody())->toBe("{$sender->name}: Please check @🚀 Development Team");
    });

    it('says "Attachment" when the message has no content', function () {
        $sender = User::factory()->create();
        $message = Message::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->conversation->inbox_id,
            'conversation_id' => $this->conversation->id,
            'content' => null,
            'sender_type' => 'User',
            'sender_id' => $sender->id,
        ]);
        $attachment = new Attachment([
            'account_id' => $this->account->id,
            'file_type' => Attachment::FILE_TYPE_IMAGE,
            'disk' => 'public',
            'path' => "attachments/{$this->account->id}/avatar.png",
            'filename' => 'avatar.png',
            'content_type' => 'image/png',
            'byte_size' => 128,
        ]);
        $attachment->attachable()->associate($message);
        $attachment->save();

        $notification = makeNotificationRecord([
            'account_id' => $this->account->id,
            'user_id' => $this->user->id,
            'primary_actor_id' => $this->conversation->id,
            'notification_type' => Notification::typeValue('assigned_conversation_new_message'),
            'secondary_actor_type' => 'Message',
            'secondary_actor_id' => $message->id,
        ]);

        expect($notification->pushMessageBody())->toBe("{$sender->name}: Attachment");
    });

    it('falls back to the last incoming message for conversation_assignment', function () {
        $contactMessage = Message::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->conversation->inbox_id,
            'conversation_id' => $this->conversation->id,
            'content' => 'Toi can ho tro',
            'message_type' => Message::TYPE_INCOMING,
            'sender_type' => 'Contact',
            'sender_id' => $this->conversation->contact_id,
        ]);

        $notification = makeNotificationRecord([
            'account_id' => $this->account->id,
            'user_id' => $this->user->id,
            'primary_actor_id' => $this->conversation->id,
            'notification_type' => Notification::typeValue('conversation_assignment'),
        ]);

        expect($notification->pushMessageBody())->toBe("{$contactMessage->sender->name}: Toi can ho tro");
    });
});

describe('dispatch events', function () {
    it('dispatches notification.created on create', function () {
        Event::fake([DomainEvent::class]);

        $notification = makeNotificationRecord([
            'account_id' => $this->account->id,
            'user_id' => $this->user->id,
            'primary_actor_id' => $this->conversation->id,
        ]);

        Event::assertDispatched(
            DomainEvent::class,
            fn (DomainEvent $event) => $event->type === EventType::NOTIFICATION_CREATED
                && $event->data['notification']->id === $notification->id
        );
    });

    it('dispatches notification.updated on update', function () {
        $notification = makeNotificationRecord([
            'account_id' => $this->account->id,
            'user_id' => $this->user->id,
            'primary_actor_id' => $this->conversation->id,
        ]);

        Event::fake([DomainEvent::class]);
        $notification->update(['read_at' => now()]);

        Event::assertDispatched(
            DomainEvent::class,
            fn (DomainEvent $event) => $event->type === EventType::NOTIFICATION_UPDATED
        );
    });

    it('dispatches notification.deleted with a plain payload', function () {
        $notification = makeNotificationRecord([
            'account_id' => $this->account->id,
            'user_id' => $this->user->id,
            'primary_actor_id' => $this->conversation->id,
        ]);
        $notificationId = $notification->id;

        Event::fake([DomainEvent::class]);
        $notification->delete();

        Event::assertDispatched(
            DomainEvent::class,
            fn (DomainEvent $event) => $event->type === EventType::NOTIFICATION_DELETED
                && $event->data['notification_data'] === [
                    'id' => $notificationId,
                    'user_id' => $this->user->id,
                    'account_id' => $this->account->id,
                ]
        );
    });
});

it('keeps only the latest notification per user and conversation', function () {
    $older = makeNotificationRecord([
        'account_id' => $this->account->id,
        'user_id' => $this->user->id,
        'primary_actor_id' => $this->conversation->id,
        'notification_type' => Notification::typeValue('conversation_creation'),
    ]);

    $newer = makeNotificationRecord([
        'account_id' => $this->account->id,
        'user_id' => $this->user->id,
        'primary_actor_id' => $this->conversation->id,
        'notification_type' => Notification::typeValue('conversation_assignment'),
    ]);

    expect(Notification::query()->pluck('id')->all())->toBe([$newer->id])
        ->and(Notification::query()->find($older->id))->toBeNull();
});

it('announces the new notification before removing the one it replaces', function () {
    makeNotificationRecord([
        'account_id' => $this->account->id,
        'user_id' => $this->user->id,
        'primary_actor_id' => $this->conversation->id,
    ]);
    $dispatchedTypes = [];
    Event::listen(DomainEvent::class, function (DomainEvent $event) use (&$dispatchedTypes) {
        $dispatchedTypes[] = $event->type;
    });

    makeNotificationRecord([
        'account_id' => $this->account->id,
        'user_id' => $this->user->id,
        'primary_actor_id' => $this->conversation->id,
    ]);

    expect($dispatchedTypes)->toBe([EventType::NOTIFICATION_CREATED, EventType::NOTIFICATION_DELETED]);
});

it('serialises the conversation and the preview body for the realtime payload', function () {
    $notification = makeNotificationRecord([
        'account_id' => $this->account->id,
        'user_id' => $this->user->id,
        'primary_actor_id' => $this->conversation->id,
    ]);

    $payload = $notification->pushEventData();

    expect($payload['notification_type'])->toBe('conversation_creation')
        ->and($payload['primary_actor_type'])->toBe('Conversation')
        ->and($payload['primary_actor']['id'])->toBe($this->conversation->display_id)
        ->and($payload['push_message_body'])->toBe($payload['push_message_title'])
        ->and($payload['account_id'])->toBe($this->account->id);
});
