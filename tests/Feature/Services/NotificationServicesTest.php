<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\Notification;
use App\Models\User;
use App\Notifications\ConversationNotification;
use App\Services\Notification\EmailNotificationService;
use App\Services\Notification\MarkConversationReadService;
use Illuminate\Support\Facades\Notification as NotificationFacade;

// Port từ spec/services/messages/new_message_notification_service_spec.rb,
// spec/services/notification/mark_conversation_read_service_spec.rb và phần điều
// kiện của notification/email_notification_service.rb.

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id]);

    $this->assignee = User::factory()->create(['confirmed_at' => now()]);
    $this->participant = User::factory()->create(['confirmed_at' => now()]);
    foreach ([$this->assignee, $this->participant] as $user) {
        AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $user->id]);
    }
    $this->inbox->addMembers([$this->assignee->id, $this->participant->id]);

    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'assignee_id' => $this->assignee->id,
    ]);
    Notification::query()->delete();
});

function incomingNotifiableMessage(): Message
{
    return Message::factory()->create([
        'account_id' => test()->account->id,
        'inbox_id' => test()->inbox->id,
        'conversation_id' => test()->conversation->id,
        'message_type' => Message::TYPE_INCOMING,
        'content' => 'Cho hoi ve gia',
    ]);
}

describe('new message notifications', function () {
    it('notifies the assignee and every participant', function () {
        $this->conversation->addParticipant($this->participant->id);
        Notification::query()->delete();

        incomingNotifiableMessage();

        expect($this->assignee->notifications()->first()->typeName())->toBe('assigned_conversation_new_message')
            ->and($this->participant->notifications()->first()->typeName())->toBe('participating_conversation_new_message');
    });

    it('does not notify the sender of an outgoing message', function () {
        $this->conversation->addParticipant($this->participant->id);
        Notification::query()->delete();

        Message::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'conversation_id' => $this->conversation->id,
            'message_type' => Message::TYPE_OUTGOING,
            'content' => 'Chao ban',
            'sender_type' => 'User',
            'sender_id' => $this->participant->id,
        ]);

        expect($this->participant->notifications()->count())->toBe(0);
    });

    it('ignores private notes and activity messages', function () {
        Message::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'conversation_id' => $this->conversation->id,
            'message_type' => Message::TYPE_OUTGOING,
            'content' => 'ghi chu noi bo',
            'private' => true,
        ]);

        expect($this->assignee->notifications()->count())->toBe(0);
    });
});

describe('mark conversation read', function () {
    it('marks the unread notifications of that conversation as read', function () {
        incomingNotifiableMessage();
        $notification = $this->assignee->notifications()->first();

        (new MarkConversationReadService($this->assignee, $this->account, $this->conversation))->perform();

        expect($notification->fresh()->read_at)->not->toBeNull();
    });

    it('leaves notifications of other conversations alone', function () {
        incomingNotifiableMessage();
        $otherConversation = Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'assignee_id' => $this->assignee->id,
        ]);
        $other = Notification::factory()->create([
            'account_id' => $this->account->id,
            'user_id' => $this->assignee->id,
            'primary_actor_id' => $otherConversation->id,
        ]);

        (new MarkConversationReadService($this->assignee, $this->account, $this->conversation))->perform();

        expect($other->fresh()->read_at)->toBeNull();
    });

    it('is cleared automatically when the agent opens the conversation', function () {
        incomingNotifiableMessage();
        $notification = $this->assignee->notifications()->first();

        $this->actingAs($this->assignee)
            ->postJson("/api/v1/accounts/{$this->account->id}/conversations/{$this->conversation->display_id}/update_last_seen")
            ->assertNoContent();

        expect($notification->fresh()->read_at)->not->toBeNull();
    });
});

describe('email notification', function () {
    it('sends the mail when the user subscribed to that type', function () {
        NotificationFacade::fake();

        $notification = Notification::factory()->ofType('conversation_assignment')->create([
            'account_id' => $this->account->id,
            'user_id' => $this->assignee->id,
            'primary_actor_id' => $this->conversation->id,
        ]);

        (new EmailNotificationService($notification))->perform();

        NotificationFacade::assertSentTo($this->assignee, ConversationNotification::class);
    });

    it('does not send when the notification was already read', function () {
        NotificationFacade::fake();

        $notification = Notification::factory()->ofType('conversation_assignment')->create([
            'account_id' => $this->account->id,
            'user_id' => $this->assignee->id,
            'primary_actor_id' => $this->conversation->id,
            'read_at' => now(),
        ]);

        (new EmailNotificationService($notification))->perform();

        NotificationFacade::assertNothingSent();
    });

    it('does not send when the user did not subscribe to that type', function () {
        NotificationFacade::fake();

        $notification = Notification::factory()->ofType('conversation_creation')->create([
            'account_id' => $this->account->id,
            'user_id' => $this->assignee->id,
            'primary_actor_id' => $this->conversation->id,
        ]);

        (new EmailNotificationService($notification))->perform();

        NotificationFacade::assertNothingSent();
    });
});
