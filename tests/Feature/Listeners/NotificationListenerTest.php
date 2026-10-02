<?php

use App\Builders\Messages\MessageBuilder;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\Notification;
use App\Models\NotificationSetting;
use App\Models\User;

// Port từ spec/listeners/notification_listener_spec.rb — chạy qua chính đường
// dispatch thật (model bắn DomainEvent) thay vì gọi listener bằng tay.

function subscribeListenerUserTo(Account $account, User $user, array $notificationTypes): void
{
    $setting = NotificationSetting::query()->firstOrNew(['account_id' => $account->id, 'user_id' => $user->id]);
    $setting->setSelectedFlags('email', array_map(fn (string $type) => "email_$type", $notificationTypes));
    $setting->setSelectedFlags('push', []);
    $setting->save();
}

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id]);

    $this->assignee = User::factory()->create();
    $this->agent = User::factory()->create();
    $this->silentAgent = User::factory()->create();

    foreach ([$this->assignee, $this->agent, $this->silentAgent] as $user) {
        AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $user->id]);
    }
    $this->inbox->addMembers([$this->assignee->id, $this->agent->id, $this->silentAgent->id]);

    subscribeListenerUserTo($this->account, $this->agent, ['conversation_creation']);
    subscribeListenerUserTo($this->account, $this->silentAgent, []);
});

describe('conversation.created', function () {
    it('notifies inbox members who turned notifications on', function () {
        Conversation::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $this->inbox->id]);

        expect($this->agent->notifications()->count())->toBe(1)
            ->and($this->silentAgent->notifications()->count())->toBe(0);
    });

    it('skips pending conversations', function () {
        Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'status' => Conversation::STATUS_PENDING,
        ]);

        expect($this->agent->notifications()->count())->toBe(0);
    });
});

describe('assignee.changed', function () {
    it('notifies the new assignee', function () {
        $conversation = Conversation::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $this->inbox->id]);
        $this->assignee->notifications()->delete();

        $conversation->update(['assignee_id' => $this->assignee->id]);

        expect($this->assignee->notifications()->count())->toBe(1)
            ->and($this->assignee->notifications()->first()->typeName())->toBe('conversation_assignment');
    });

    it('does nothing when the assignee is cleared', function () {
        $conversation = Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'assignee_id' => $this->assignee->id,
        ]);
        Notification::query()->delete();

        $conversation->update(['assignee_id' => null]);

        expect(Notification::query()->count())->toBe(0);
    });

    it('assigns quietly when the assignment policy hands over a conversation already read', function () {
        $conversation = Conversation::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $this->inbox->id]);
        Message::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $this->inbox->id, 'conversation_id' => $conversation->id]);
        $conversation->update(['agent_last_seen_at' => now()->addSecond()]);
        Notification::query()->delete();
        Notification::factory()->create([
            'account_id' => $this->account->id,
            'user_id' => $this->assignee->id,
            'primary_actor_id' => $conversation->id,
            'read_at' => now(),
        ]);

        $conversation->update(['assignee_id' => $this->assignee->id]);

        expect($this->assignee->notifications()->count())->toBe(1);
    });

    it('still notifies an automatic assignee who never saw a conversation another agent read', function () {
        $conversation = Conversation::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $this->inbox->id]);
        Message::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $this->inbox->id, 'conversation_id' => $conversation->id]);
        $conversation->update(['agent_last_seen_at' => now()->addSecond()]);
        Notification::query()->delete();

        $conversation->update(['assignee_id' => $this->assignee->id]);

        expect($this->assignee->notifications()->count())->toBe(1);
    });

    it('still notifies when a teammate assigns a conversation already read', function () {
        $conversation = Conversation::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $this->inbox->id, 'agent_last_seen_at' => now()]);
        Notification::query()->delete();

        $this->actingAs($this->agent);
        $conversation->update(['assignee_id' => $this->assignee->id]);

        expect($this->assignee->notifications()->count())->toBe(1);
    });

    it('does not notify a self-assignment', function () {
        $conversation = Conversation::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $this->inbox->id]);
        Notification::query()->delete();

        $this->actingAs($this->assignee);
        $conversation->update(['assignee_id' => $this->assignee->id]);

        expect($this->assignee->notifications()->count())->toBe(0);
    });
});

describe('message.created', function () {
    it('creates a single mention notification for a mentioned assignee', function () {
        $conversation = Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'assignee_id' => $this->agent->id,
        ]);
        Notification::query()->delete();

        (new MessageBuilder($this->assignee, $conversation, [
            'content' => "hi [@{$this->agent->name}](mention://user/{$this->agent->id}/{$this->agent->name})",
            'private' => true,
            'message_type' => 'outgoing',
        ]))->perform();

        expect($this->agent->notifications()->count())->toBe(1)
            ->and($this->agent->notifications()->first()->typeName())->toBe('conversation_mention');
    });

    it('does not notify on a private note without mentions', function () {
        $conversation = Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'assignee_id' => $this->agent->id,
        ]);
        $conversation->addParticipant($this->agent->id);
        Notification::query()->delete();

        (new MessageBuilder($this->assignee, $conversation, [
            'content' => 'hi',
            'private' => true,
            'message_type' => 'outgoing',
        ]))->perform();

        expect($this->agent->notifications()->count())->toBe(0);
    });

    it('notifies the assignee about a new incoming message', function () {
        $conversation = Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'assignee_id' => $this->agent->id,
        ]);
        Notification::query()->delete();

        Message::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'conversation_id' => $conversation->id,
            'message_type' => Message::TYPE_INCOMING,
            'content' => 'Toi can ho tro',
        ]);

        expect($this->agent->notifications()->count())->toBe(1)
            ->and($this->agent->notifications()->first()->typeName())->toBe('assigned_conversation_new_message');
    });

    it('survives a message without content', function () {
        $conversation = Conversation::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $this->inbox->id]);

        expect(fn () => Message::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'conversation_id' => $conversation->id,
            'content' => null,
            'private' => true,
        ]))->not->toThrow(Exception::class);
    });
});
