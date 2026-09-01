<?php

use App\Models\Account;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;

// Port từ spec/models/conversation_spec.rb.
// Bỏ ở B3: dispatcher/event dispatch + FilteredCountInvalidator (B4), activity
// messages + toggle_status/snooze/bot_handoff (B5), assignment/auto-assignment (B6),
// label update_labels (B7), mute/unmute qua Redis (B4), csat_survey_link (C5),
// agent bot/ai_assignee/campaign (D4/EE/C4), unread sort arel (B8), push_event_data
// (shape JSON test ở ConversationsControllerTest), validate độ dài jsonb value
// (validator chưa port — đi cùng custom attributes E1), delete conversation (B5+).

function conversationBase(): array
{
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->create(['account_id' => $account->id]);
    $contact = Contact::factory()->create(['account_id' => $account->id]);
    $contactInbox = ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $inbox->id]);

    return [$account, $inbox, $contact, $contactInbox];
}

function conversationIn(array $base, array $attributes = []): Conversation
{
    [$account, $inbox, $contact, $contactInbox] = $base;

    return Conversation::factory()->create([
        'account_id' => $account->id,
        'inbox_id' => $inbox->id,
        'contact_id' => $contact->id,
        'contact_inbox_id' => $contactInbox->id,
        ...$attributes,
    ]);
}

describe('before create', function () {
    it('runs before_create callbacks and sets display_id', function () {
        $conversation = Conversation::factory()->create();

        expect($conversation->display_id)->toBe(1);
    });

    it('generates display_id independently per account', function () {
        $firstBase = conversationBase();
        $secondBase = conversationBase();

        $firstOfAccountOne = conversationIn($firstBase);
        $secondOfAccountOne = conversationIn($firstBase);
        $firstOfAccountTwo = conversationIn($secondBase);

        expect($firstOfAccountOne->display_id)->toBe(1)
            ->and($secondOfAccountOne->display_id)->toBe(2)
            ->and($firstOfAccountTwo->display_id)->toBe(1);
    });

    it('sets waiting since to the created at time', function () {
        $conversation = Conversation::factory()->create()->fresh();

        expect($conversation->waiting_since)->not->toBeNull()
            ->and($conversation->waiting_since->equalTo($conversation->created_at))->toBeTrue();
    });

    it('creates a UUID for every conversation automatically', function () {
        $conversation = Conversation::factory()->create();

        expect($conversation->uuid)
            ->toMatch('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i');
    });

    it('creates conversation with open status by default', function () {
        [$account, $inbox, $contact, $contactInbox] = conversationBase();

        $conversation = Conversation::query()->create([
            'account_id' => $account->id,
            'inbox_id' => $inbox->id,
            'contact_id' => $contact->id,
            'contact_inbox_id' => $contactInbox->id,
        ]);

        expect($conversation->statusName())->toBe('open');
    });
});

describe('when conversation is created by blocked contact', function () {
    it('creates conversation in resolved state', function () {
        $base = conversationBase();
        $base[2]->update(['blocked' => true]);

        $conversation = conversationIn($base);

        expect($conversation->statusName())->toBe('resolved');
    });
});

describe('ensure_snooze_until_reset', function () {
    it('resets the snoozed_until when status is toggled', function () {
        $conversation = Conversation::factory()->create([
            'status' => Conversation::STATUS_SNOOZED,
            'snoozed_until' => now()->addDay(),
        ]);

        expect($conversation->snoozed_until)->not->toBeNull();

        $conversation->update(['status' => Conversation::STATUS_OPEN]);

        expect($conversation->fresh()->snoozed_until)->toBeNull();
    });

    it('clears snoozed_until on create when status is not snoozed', function () {
        $conversation = Conversation::factory()->create(['snoozed_until' => now()->addDay()]);

        expect($conversation->fresh()->snoozed_until)->toBeNull();
    });
});

describe('status_changed_at', function () {
    it('is set on create', function () {
        expect(Conversation::factory()->create()->status_changed_at)->not->toBeNull();
    });

    it('is updated on every status transition', function () {
        $conversation = Conversation::factory()->create();
        $original = $conversation->fresh()->status_changed_at;

        $this->travel(1)->hours();
        $conversation->update(['status' => Conversation::STATUS_RESOLVED]);

        expect($conversation->fresh()->status_changed_at->greaterThan($original))->toBeTrue();
    });

    it('is untouched by non-status saves', function () {
        $conversation = Conversation::factory()->create();
        $original = $conversation->fresh()->status_changed_at;

        $this->travel(1)->hours();
        $conversation->update(['priority' => Conversation::PRIORITY_HIGH]);

        expect($conversation->fresh()->status_changed_at->equalTo($original))->toBeTrue();
    });
});

describe('handle resolved status change', function () {
    it('clears waiting_since when the conversation is resolved', function () {
        $conversation = Conversation::factory()->create();

        expect($conversation->fresh()->waiting_since)->not->toBeNull();

        $conversation->update(['status' => Conversation::STATUS_RESOLVED]);

        expect($conversation->fresh()->waiting_since)->toBeNull();
    });
});

describe('validate referer url', function () {
    it('nullifies an invalid referer url', function () {
        $conversation = Conversation::factory()->create(['additional_attributes' => ['referer' => 'javascript']]);

        expect($conversation->additional_attributes['referer'])->toBeNull();
    });

    it('keeps a valid referer url', function () {
        $conversation = Conversation::factory()->create([
            'additional_attributes' => ['referer' => 'https://www.chatwoot.com/'],
        ]);

        expect($conversation->additional_attributes['referer'])->toBe('https://www.chatwoot.com/');
    });
});

describe('unread incoming messages', function () {
    it('returns unread incoming messages count since agent last seen', function () {
        $base = conversationBase();
        $conversation = conversationIn($base, ['agent_last_seen_at' => now()->subHour()]);
        $messageAttributes = [
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
            'conversation_id' => $conversation->id,
        ];

        Message::factory()->create([...$messageAttributes, 'created_at' => now()->subMonth()]);
        Message::factory()->outgoing()->create([...$messageAttributes, 'created_at' => now()->subMinute()]);
        Message::factory()->create([...$messageAttributes, 'created_at' => now()->subMinute()]);

        expect($conversation->unreadIncomingMessagesCount())->toBe(1);
    });

    it('counts all incoming messages when the agent has not seen the conversation', function () {
        $conversation = Conversation::factory()->create(['agent_last_seen_at' => null]);
        $messageAttributes = [
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
            'conversation_id' => $conversation->id,
        ];

        Message::factory()->create([...$messageAttributes, 'created_at' => now()->subMonth()]);
        Message::factory()->create([...$messageAttributes, 'created_at' => now()->subMinute()]);

        expect($conversation->unreadIncomingMessagesCount())->toBe(2);
    });
});

describe('cached_label_list_array', function () {
    it('returns the correct list of labels', function () {
        $conversation = Conversation::factory()->create();
        $conversation->forceFill(['cached_label_list' => 'customer-support, enterprise, paid-customer'])->save();

        expect($conversation->fresh()->cachedLabelListArray())
            ->toBe(['customer-support', 'enterprise', 'paid-customer']);
    });

    it('returns an empty array when there are no labels', function () {
        expect(Conversation::factory()->create()->cachedLabelListArray())->toBe([]);
    });
});

describe('can_reply on api channel', function () {
    it('returns true when agent_reply_time_window is not configured', function () {
        expect(Conversation::factory()->create()->canReply())->toBeTrue();
    });

    it('returns false when a window is configured and there is no incoming message', function () {
        $base = conversationBase();
        $base[1]->channel->update(['additional_attributes' => ['agent_reply_time_window' => 12]]);
        $conversation = conversationIn($base);

        expect($conversation->canReply())->toBeFalse();
    });

    it('returns false when the last incoming message is outside the window', function () {
        $base = conversationBase();
        $base[1]->channel->update(['additional_attributes' => ['agent_reply_time_window' => 12]]);
        $conversation = conversationIn($base);
        Message::factory()->create([
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
            'conversation_id' => $conversation->id,
            'created_at' => now()->subHours(13),
        ]);

        expect($conversation->canReply())->toBeFalse();
    });

    it('returns true when the last incoming message is within the window', function () {
        $base = conversationBase();
        $base[1]->channel->update(['additional_attributes' => ['agent_reply_time_window' => 12]]);
        $conversation = conversationIn($base);
        Message::factory()->create([
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
            'conversation_id' => $conversation->id,
        ]);

        expect($conversation->canReply())->toBeTrue();
    });
});

describe('assignment scopes', function () {
    it('filters unassigned, assigned and assigned-to conversations', function () {
        $base = conversationBase();
        $agent = User::factory()->create();
        $assigned = conversationIn($base, ['assignee_id' => $agent->id]);
        $unassigned = conversationIn($base);
        $botAssigned = conversationIn($base, ['assignee_agent_bot_id' => 99]);

        expect(Conversation::query()->unassigned()->pluck('id')->all())->toBe([$unassigned->id])
            ->and(Conversation::query()->assigned()->orderBy('id')->pluck('id')->all())
            ->toBe([$assigned->id, $botAssigned->id])
            ->and(Conversation::query()->assignedTo($agent)->pluck('id')->all())->toBe([$assigned->id]);
    });
});

describe('custom sort option', function () {
    // Bộ dữ liệu y hệ spec gốc: 7 hội thoại lệch created_at/last_activity_at/priority.
    function sortedConversations(): array
    {
        $base = conversationBase();

        return [
            7 => conversationIn($base, ['created_at' => now()->subDays(6), 'last_activity_at' => now()->subDays(13)]),
            6 => conversationIn($base, ['created_at' => now()->subDays(7), 'last_activity_at' => now()->subDays(10)]),
            5 => conversationIn($base, ['created_at' => now()->subDays(8), 'last_activity_at' => now()->subDays(12), 'priority' => Conversation::PRIORITY_URGENT]),
            4 => conversationIn($base, ['created_at' => now()->subDays(9), 'last_activity_at' => now()->subDays(11), 'priority' => Conversation::PRIORITY_URGENT]),
            3 => conversationIn($base, ['created_at' => now()->subDays(5), 'last_activity_at' => now()->subDays(9), 'priority' => Conversation::PRIORITY_LOW]),
            2 => conversationIn($base, ['created_at' => now()->subDays(3), 'last_activity_at' => now()->subDays(6), 'priority' => Conversation::PRIORITY_HIGH]),
            1 => conversationIn($base, ['created_at' => now()->subDays(4), 'last_activity_at' => now()->subDays(8), 'priority' => Conversation::PRIORITY_MEDIUM]),
        ];
    }

    function idsOf(array $conversations, array $order): array
    {
        return array_map(fn (int $key) => $conversations[$key]->id, $order);
    }

    it('sort_on_created_at returns ascending order by default and descending when asked', function () {
        $conversations = sortedConversations();
        $descOrder = idsOf($conversations, [2, 1, 3, 7, 6, 5, 4]);

        expect(Conversation::query()->sortOnCreatedAt()->pluck('id')->all())->toBe(array_reverse($descOrder))
            ->and(Conversation::query()->sortOnCreatedAt('desc')->pluck('id')->all())->toBe($descOrder);
    });

    it('sort_on_last_activity_at returns descending order by default and ascending when asked', function () {
        $conversations = sortedConversations();
        $ascOrder = idsOf($conversations, [7, 5, 4, 6, 3, 1, 2]);

        expect(Conversation::query()->sortOnLastActivityAt()->pluck('id')->all())->toBe(array_reverse($ascOrder))
            ->and(Conversation::query()->sortOnLastActivityAt('asc')->pluck('id')->all())->toBe($ascOrder);
    });

    it('sort_on_priority orders urgent > high > medium > low > null by default', function () {
        $conversations = sortedConversations();

        expect(Conversation::query()->sortOnPriority()->pluck('id')->all())
            ->toBe(idsOf($conversations, [4, 5, 2, 1, 3, 6, 7]));
    });

    it('sort_on_priority asc orders low > medium > high > urgent with null last', function () {
        $conversations = sortedConversations();

        expect(Conversation::query()->sortOnPriority('asc')->pluck('id')->all())
            ->toBe(idsOf($conversations, [3, 1, 2, 4, 5, 6, 7]));
    });

    it('sort_on_priority breaks ties with last_activity_at', function () {
        $conversations = sortedConversations();

        expect(
            Conversation::query()->where('priority', Conversation::PRIORITY_URGENT)->sortOnPriority()->pluck('id')->all()
        )->toBe(idsOf($conversations, [4, 5]))
            ->and(Conversation::query()->whereNull('priority')->sortOnPriority()->pluck('id')->all())
            ->toBe(idsOf($conversations, [6, 7]));
    });

    it('sort_on_waiting_since returns ascending order by default and descending when asked', function () {
        $conversations = sortedConversations();
        $ascOrder = idsOf($conversations, [4, 5, 6, 7, 3, 1, 2]);

        expect(Conversation::query()->sortOnWaitingSince()->pluck('id')->all())->toBe($ascOrder)
            ->and(Conversation::query()->sortOnWaitingSince('desc')->pluck('id')->all())->toBe(array_reverse($ascOrder));
    });

    it('sort_on_waiting_since places null waiting_since conversations at the end', function () {
        $conversations = sortedConversations();
        $conversations[5]->update(['waiting_since' => null]);
        $conversations[2]->update(['waiting_since' => null]);

        expect(Conversation::query()->sortOnWaitingSince()->pluck('id')->all())
            ->toBe(idsOf($conversations, [4, 6, 7, 3, 1, 5, 2]))
            ->and(Conversation::query()->sortOnWaitingSince('desc')->pluck('id')->all())
            ->toBe(idsOf($conversations, [1, 3, 7, 6, 4, 5, 2]));
    });
});

describe('last_activity_at', function () {
    it('sets last_activity_at to the created_at time on create', function () {
        $conversation = Conversation::factory()->create()->fresh();

        expect($conversation->last_activity_at->equalTo($conversation->created_at))->toBeTrue();
    });
});
