<?php

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Jobs\Conversations\ActivityMessageJob;
use App\Models\Account;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Queue;

// Port từ spec/models/conversation_spec.rb.
// Bỏ ở B3: dispatcher/event dispatch + FilteredCountInvalidator (B4), activity
// bot_handoff (AgentBot), assignment/auto-assignment (B6),
// label update_labels (B7), csat_survey_link (C5),
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
            'additional_attributes' => ['referer' => 'https://www.example.com/'],
        ]);

        expect($conversation->additional_attributes['referer'])->toBe('https://www.example.com/');
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

    it('judges the window by the newest incoming message, not the oldest', function () {
        $base = conversationBase();
        $base[1]->channel->update(['additional_attributes' => ['agent_reply_time_window' => 1]]);
        $conversation = conversationIn($base);
        $incomingAt = fn (DateTimeInterface $at) => Message::factory()->create([
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
            'conversation_id' => $conversation->id,
            'message_type' => Message::TYPE_INCOMING,
            'created_at' => $at,
        ]);

        $incomingAt(now()->subHours(3));
        $incomingAt(now()->subMinutes(5));
        expect($conversation->canReply())->toBeTrue();

        $closed = conversationIn($base);
        Message::factory()->create([
            'account_id' => $closed->account_id,
            'inbox_id' => $closed->inbox_id,
            'conversation_id' => $closed->id,
            'message_type' => Message::TYPE_INCOMING,
            'created_at' => now()->subHours(3),
        ]);
        expect($closed->canReply())->toBeFalse();
    });
});

describe('messagesNewestFirst', function () {
    it('orders by message time newest first, breaking ties by id, even when ids arrived out of time order', function () {
        $conversation = Conversation::factory()->create();
        $at = fn (DateTimeInterface $time) => Message::factory()->create([
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
            'conversation_id' => $conversation->id,
            'created_at' => $time,
        ])->id;

        $sameMoment = now()->subMinute();
        $newest = $at(now());
        $tieFirst = $at($sameMoment);
        $tieSecond = $at($sameMoment);
        $backfilledOldest = $at(now()->subDay());

        expect($conversation->messagesNewestFirst()->pluck('id')->all())
            ->toBe([$newest, $tieSecond, $tieFirst, $backfilledOldest]);
    });

    it('app code never chains a descending order straight onto messages()', function () {
        $offenders = [];

        foreach (File::allFiles(app_path()) as $file) {
            $source = $file->getContents();
            preg_match_all('/([\w$>\-?()]*)->messages\(\)/', $source, $calls, PREG_OFFSET_CAPTURE);

            foreach ($calls[0] as $index => [$call, $offset]) {
                if (preg_match('/inbox|bot/i', $calls[1][$index][0]) === 1) {
                    continue;
                }

                $chain = '';
                $depth = 0;
                for ($position = $offset + strlen($call); $position < strlen($source); $position++) {
                    $character = $source[$position];
                    $depth += match ($character) {
                        '(' => 1, ')' => -1, default => 0
                    };
                    if ($depth < 0 || ($depth === 0 && in_array($character, [';', ','], true))) {
                        break;
                    }
                    $chain .= $character;
                }

                if (preg_match('/->(latest|orderByDesc)\(|->orderBy\([^)]*desc/i', $chain) === 1 && ! str_contains($chain, '->reorder(')) {
                    $offenders[] = $file->getRelativePathname().':'.(substr_count(substr($source, 0, $offset), "\n") + 1);
                }
            }
        }

        expect($offenders)->toBe([], 'messages() đã sắp created_at tăng dần; lấy tin mới nhất phải qua messagesNewestFirst()');
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

describe('dispatch events', function () {
    beforeEach(function () {
        Event::fake([DomainEvent::class]);
    });

    it('dispatches conversation.created after create', function () {
        $conversation = conversationIn(conversationBase());

        Event::assertDispatched(DomainEvent::class, fn (DomainEvent $event) => $event->type === EventType::CONVERSATION_CREATED
            && $event->data['conversation']->is($conversation)
            && $event->data['notifiable_assignee_change'] === false
            && $event->data['changed_attributes'] === null
            && $event->data['performed_by'] === null);
    });

    it('dispatches conversation.updated with changed_attributes when status changes', function () {
        $conversation = conversationIn(conversationBase());

        $conversation->update(['status' => Conversation::STATUS_RESOLVED]);

        Event::assertDispatched(DomainEvent::class, fn (DomainEvent $event) => $event->type === EventType::CONVERSATION_UPDATED
            && $event->data['conversation']->is($conversation)
            && $event->data['changed_attributes']['status'] === [Conversation::STATUS_OPEN, Conversation::STATUS_RESOLVED]);
    });

    it('does not dispatch conversation.updated when only last_activity_at changes', function () {
        $conversation = conversationIn(conversationBase());

        $conversation->update(['last_activity_at' => now()->addHour()]);

        Event::assertNotDispatched(DomainEvent::class, fn (DomainEvent $event) => $event->type === EventType::CONVERSATION_UPDATED);
    });

    it('flags notifiable_assignee_change when assigned to someone else', function () {
        $base = conversationBase();
        $conversation = conversationIn($base);
        $assignee = User::factory()->create();
        $actor = User::factory()->create();
        $this->actingAs($actor);

        $conversation->update(['assignee_id' => $assignee->id]);

        Event::assertDispatched(DomainEvent::class, fn (DomainEvent $event) => $event->type === EventType::CONVERSATION_UPDATED
            && $event->data['notifiable_assignee_change'] === true
            && $event->data['performed_by']->is($actor));

        $conversation->update(['assignee_id' => $actor->id]);
        Event::assertDispatched(DomainEvent::class, fn (DomainEvent $event) => $event->type === EventType::CONVERSATION_UPDATED
            && $event->data['changed_attributes']['assignee_id'] === [$assignee->id, $actor->id]
            && $event->data['notifiable_assignee_change'] === false);
    });
});

describe('toggle_status', function () {
    it('toggles conversation status to resolved when open', function () {
        $conversation = conversationIn(conversationBase(), ['status' => Conversation::STATUS_OPEN]);

        expect($conversation->toggleStatus())->toBeTrue()
            ->and($conversation->fresh()->statusName())->toBe('resolved');
    });

    it('toggles conversation status to open when resolved', function () {
        $conversation = conversationIn(conversationBase(), ['status' => Conversation::STATUS_RESOLVED]);

        expect($conversation->toggleStatus())->toBeTrue()
            ->and($conversation->fresh()->statusName())->toBe('open');
    });

    it('toggles conversation status to open when pending', function () {
        $conversation = conversationIn(conversationBase(), ['status' => Conversation::STATUS_PENDING]);

        expect($conversation->toggleStatus())->toBeTrue()
            ->and($conversation->fresh()->statusName())->toBe('open');
    });

    it('toggles conversation status to open when snoozed', function () {
        $conversation = conversationIn(conversationBase(), ['status' => Conversation::STATUS_SNOOZED]);

        expect($conversation->toggleStatus())->toBeTrue()
            ->and($conversation->fresh()->statusName())->toBe('open');
    });

    it('resets the snoozed_until when status is toggled', function () {
        $conversation = conversationIn(conversationBase(), ['status' => Conversation::STATUS_SNOOZED, 'snoozed_until' => now()->addDays(2)]);

        expect($conversation->snoozed_until)->not->toBeNull()
            ->and($conversation->toggleStatus())->toBeTrue()
            ->and($conversation->fresh()->snoozed_until)->toBeNull();
    });
});

describe('toggle_priority', function () {
    it('defaults priority to null when created', function () {
        expect(conversationIn(conversationBase())->priority)->toBeNull();
    });

    it('toggles the priority to null if nothing is passed', function () {
        $conversation = conversationIn(conversationBase(), ['priority' => Conversation::PRIORITY_HIGH]);

        expect($conversation->togglePriority())->toBeTrue()
            ->and($conversation->fresh()->priority)->toBeNull();
    });

    it('sets the priority by name', function (string $name) {
        $conversation = conversationIn(conversationBase());

        expect($conversation->togglePriority($name))->toBeTrue()
            ->and($conversation->fresh()->priorityName())->toBe($name);
    })->with(['low', 'medium', 'high', 'urgent']);
});

describe('activity messages', function () {
    function activityJobParams(Conversation $conversation, string $content, ?array $contentAttributes = null): array
    {
        $params = [
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
            'message_type' => Message::TYPE_ACTIVITY,
            'content' => $content,
        ];

        if ($contentAttributes !== null) {
            $params['content_attributes'] = $contentAttributes;
        }

        return $params;
    }

    function assertActivityJobPushed(Conversation $conversation, string $content, ?array $contentAttributes = null): void
    {
        Queue::assertPushed(ActivityMessageJob::class, fn (ActivityMessageJob $job) => $job->conversation->is($conversation)
            && $job->messageParams === activityJobParams($conversation, $content, $contentAttributes)
            && $job->queue === 'high');
    }

    it('creates status change activity with the current user name', function () {
        $user = User::factory()->create();
        $this->actingAs($user);
        $conversation = conversationIn(conversationBase());
        Queue::fake();

        $conversation->update(['status' => Conversation::STATUS_RESOLVED]);

        assertActivityJobPushed($conversation, "Conversation was marked resolved by {$user->name}", [
            'activity' => ['type' => 'conversation_status_changed', 'status' => 'resolved'],
        ]);
    });

    it('uses the right sentence for every status', function (int $status, string $sentence) {
        $user = User::factory()->create(['name' => 'Agent Smith']);
        $this->actingAs($user);
        $conversation = conversationIn(conversationBase(), ['status' => $status === Conversation::STATUS_OPEN ? Conversation::STATUS_RESOLVED : Conversation::STATUS_OPEN]);
        Queue::fake();

        $conversation->update(['status' => $status]);

        assertActivityJobPushed($conversation, $sentence, [
            'activity' => ['type' => 'conversation_status_changed', 'status' => Conversation::STATUS_NAMES[$status]],
        ]);
    })->with([
        [Conversation::STATUS_OPEN, 'Conversation was reopened by Agent Smith'],
        [Conversation::STATUS_PENDING, 'Conversation was marked as pending by Agent Smith'],
        [Conversation::STATUS_SNOOZED, 'Conversation was snoozed by Agent Smith'],
    ]);

    it('adds a message for system auto resolution if marked resolved by system', function () {
        $base = conversationBase();
        $base[0]->update(['settings' => ['auto_resolve_after' => 40 * 24 * 60]]);
        $conversation = conversationIn($base);
        Queue::fake();

        $conversation->update(['status' => Conversation::STATUS_RESOLVED]);

        assertActivityJobPushed($conversation, 'Conversation was marked resolved by system due to 40 days of inactivity', [
            'activity' => ['type' => 'conversation_status_changed', 'status' => 'resolved'],
        ]);
    });

    it('does not create activity when reopened without a user', function () {
        $conversation = conversationIn(conversationBase(), ['status' => Conversation::STATUS_SNOOZED]);
        Queue::fake();

        $conversation->update(['status' => Conversation::STATUS_OPEN]);

        Queue::assertNotPushed(ActivityMessageJob::class);
    });

    it('creates priority added, updated and removed activities', function () {
        $user = User::factory()->create(['name' => 'Agent Smith']);
        $this->actingAs($user);
        $conversation = conversationIn(conversationBase());
        Queue::fake();

        $conversation->update(['priority' => Conversation::PRIORITY_LOW]);
        assertActivityJobPushed($conversation, 'Agent Smith set the priority to low');

        $conversation->update(['priority' => Conversation::PRIORITY_HIGH]);
        assertActivityJobPushed($conversation, 'Agent Smith changed the priority from low to high');

        $conversation->update(['priority' => null]);
        assertActivityJobPushed($conversation, 'Agent Smith removed the priority');
    });

    it('persists the activity message through the job', function () {
        $user = User::factory()->create();
        $this->actingAs($user);
        $conversation = conversationIn(conversationBase());

        $conversation->update(['status' => Conversation::STATUS_RESOLVED]);

        $activity = $conversation->messages()->where('message_type', Message::TYPE_ACTIVITY)->first();
        expect($activity)->not->toBeNull()
            ->and($activity->content)->toBe("Conversation was marked resolved by {$user->name}")
            ->and($activity->content_attributes)->toBe(['activity' => ['type' => 'conversation_status_changed', 'status' => 'resolved']]);
    });
});

describe('status change events', function () {
    beforeEach(function () {
        Event::fake([DomainEvent::class]);
    });

    function dispatchedTypes(): array
    {
        $types = [];
        Event::assertDispatched(DomainEvent::class, function (DomainEvent $event) use (&$types) {
            $types[] = $event->type;

            return true;
        });

        return $types;
    }

    it('dispatches opened + status_changed when reopened', function () {
        $conversation = conversationIn(conversationBase(), ['status' => Conversation::STATUS_RESOLVED]);

        $conversation->update(['status' => Conversation::STATUS_OPEN]);

        $types = dispatchedTypes();
        expect($types)->toContain(EventType::CONVERSATION_OPENED, EventType::CONVERSATION_STATUS_CHANGED, EventType::CONVERSATION_UPDATED)
            ->and($types)->not->toContain(EventType::CONVERSATION_RESOLVED);
    });

    it('dispatches resolved + status_changed when resolved', function () {
        $conversation = conversationIn(conversationBase());

        $conversation->update(['status' => Conversation::STATUS_RESOLVED]);

        $types = dispatchedTypes();
        expect($types)->toContain(EventType::CONVERSATION_RESOLVED, EventType::CONVERSATION_STATUS_CHANGED)
            ->and($types)->not->toContain(EventType::CONVERSATION_OPENED);
    });

    it('dispatches conversation.read when contact_last_seen_at changes', function () {
        $conversation = conversationIn(conversationBase());

        $conversation->update(['contact_last_seen_at' => now()]);

        expect(dispatchedTypes())->toContain(EventType::CONVERSATION_READ)
            ->not->toContain(EventType::CONVERSATION_STATUS_CHANGED);
    });

    it('dispatches conversation.contact_changed when contact_id changes', function () {
        $base = conversationBase();
        $conversation = conversationIn($base);
        $otherContact = Contact::factory()->create(['account_id' => $base[0]->id]);

        $conversation->update(['contact_id' => $otherContact->id]);

        expect(dispatchedTypes())->toContain(EventType::CONVERSATION_CONTACT_CHANGED);
    });
});

describe('mute', function () {
    it('marks conversation as resolved, blocks the contact and creates mute message', function () {
        $user = User::factory()->create();
        $this->actingAs($user);
        $conversation = conversationIn(conversationBase());
        Queue::fake();

        $conversation->mute();

        expect($conversation->fresh()->isResolved())->toBeTrue()
            ->and($conversation->fresh()->contact->blocked)->toBeTrue()
            ->and($conversation->isMuted())->toBeTrue();
        assertActivityJobPushed($conversation, "{$user->name} has muted the conversation");
    });

    it('does nothing when contact is missing', function () {
        $this->actingAs(User::factory()->create());
        $conversation = conversationIn(conversationBase());
        $conversation->newModelQuery()->whereKey($conversation->id)->toBase()->update(['contact_id' => null, 'contact_inbox_id' => null]);
        $conversation = $conversation->fresh();
        Queue::fake();

        $conversation->mute();

        expect($conversation->fresh()->statusName())->toBe('open')
            ->and($conversation->isMuted())->toBeFalse();
        Queue::assertNotPushed(ActivityMessageJob::class);
    });

    it('unmute keeps status, unblocks the contact and creates unmute message', function () {
        $user = User::factory()->create();
        $this->actingAs($user);
        $conversation = conversationIn(conversationBase());
        $conversation->mute();
        Queue::fake();

        $conversation->unmute();

        expect($conversation->fresh()->statusName())->toBe('resolved')
            ->and($conversation->fresh()->contact->blocked)->toBeFalse()
            ->and($conversation->isMuted())->toBeFalse();
        assertActivityJobPushed($conversation, "{$user->name} has unmuted the conversation");
    });

    it('returns false for muted? when not muted', function () {
        expect(conversationIn(conversationBase())->isMuted())->toBeFalse();
    });
});

describe('unread messages', function () {
    it('returns messages created after agent_last_seen_at', function () {
        $base = conversationBase();
        [$account] = $base;
        $conversation = conversationIn($base, ['agent_last_seen_at' => now()->subHour()]);
        $seen = Message::factory()->create([
            'account_id' => $account->id,
            'conversation_id' => $conversation->id,
            'created_at' => now()->subMonth(),
        ]);
        $unseen = Message::factory()->create([
            'account_id' => $account->id,
            'conversation_id' => $conversation->id,
            'created_at' => now()->subMinute(),
        ]);

        expect($conversation->unreadMessages()->pluck('id')->all())->toBe([$unseen->id])
            ->and($conversation->unreadMessages()->pluck('id')->all())->not->toContain($seen->id);
    });

    it('returns only unread incoming messages, even when the agent has never seen the conversation', function () {
        $base = conversationBase();
        [$account] = $base;
        $conversation = conversationIn($base, ['agent_last_seen_at' => null]);
        $incoming = Message::factory()->create([
            'account_id' => $account->id,
            'conversation_id' => $conversation->id,
        ]);
        Message::factory()->outgoing()->create([
            'account_id' => $account->id,
            'conversation_id' => $conversation->id,
        ]);

        expect($conversation->unreadIncomingMessages()->pluck('id')->all())->toBe([$incoming->id])
            ->and($conversation->unreadIncomingMessagesCount())->toBe(1);
    });

    it('caps the unread count at ten like the source array based counter', function () {
        $base = conversationBase();
        [$account] = $base;
        $conversation = conversationIn($base, ['agent_last_seen_at' => null]);
        Message::factory()->count(13)->create([
            'account_id' => $account->id,
            'conversation_id' => $conversation->id,
        ]);

        expect($conversation->unreadIncomingMessagesCount())->toBe(10)
            ->and($conversation->unreadIncomingMessages())->toHaveCount(10);
    });

    it('counts assignee unread messages from assignee_last_seen_at', function () {
        $base = conversationBase();
        [$account] = $base;
        $conversation = conversationIn($base, ['assignee_last_seen_at' => now()->subMinutes(10)]);
        Message::factory()->create([
            'account_id' => $account->id,
            'conversation_id' => $conversation->id,
            'created_at' => now()->subHour(),
        ]);

        expect($conversation->assigneeUnreadMessages()->exists())->toBeFalse();

        Message::factory()->create([
            'account_id' => $account->id,
            'conversation_id' => $conversation->id,
            'created_at' => now()->subMinute(),
        ]);

        expect($conversation->assigneeUnreadMessages()->exists())->toBeTrue();
    });
});

describe('B8 scopes', function () {
    it('unattended keeps conversations without a first reply or still waiting', function () {
        $base = conversationBase();
        $attended = conversationIn($base, ['first_reply_created_at' => now()]);
        $attended->forceFill(['waiting_since' => null])->save();
        $noFirstReply = conversationIn($base, ['first_reply_created_at' => null]);
        $stillWaiting = conversationIn($base, ['first_reply_created_at' => now()]);

        $ids = Conversation::query()->unattended()->pluck('id')->all();

        expect($ids)->toContain($noFirstReply->id, $stillWaiting->id)
            ->and($ids)->not->toContain($attended->id);
    });

    it('sortOnUnread puts the highest unread count first and falls back to last activity', function () {
        $base = conversationBase();
        [$account] = $base;
        $mostUnread = conversationIn($base, ['agent_last_seen_at' => now()->subHour()]);
        $unread = conversationIn($base, ['agent_last_seen_at' => now()->subHour()]);
        $read = conversationIn($base, ['agent_last_seen_at' => now()->addMinute()]);

        foreach ([$mostUnread, $unread, $read] as $conversation) {
            Message::factory()->create([
                'account_id' => $account->id,
                'conversation_id' => $conversation->id,
                'created_at' => now()->subMinutes(5),
            ]);
        }
        Message::factory()->create([
            'account_id' => $account->id,
            'conversation_id' => $mostUnread->id,
            'created_at' => now()->subMinutes(4),
        ]);
        $read->forceFill(['last_activity_at' => now()->addMinute()])->save();
        $unread->forceFill(['last_activity_at' => now()->addMinutes(2)])->save();

        $ids = Conversation::query()->sortOnUnread()->pluck('id')->all();

        expect($ids)->toBe([$mostUnread->id, $unread->id, $read->id]);
    });

    it('sortOnUnread counts private incoming messages too', function () {
        $base = conversationBase();
        [$account] = $base;
        $privateUnread = conversationIn($base, ['agent_last_seen_at' => now()->subHour()]);
        $unread = conversationIn($base, ['agent_last_seen_at' => now()->subHour()]);

        Message::factory()->count(2)->create([
            'account_id' => $account->id,
            'conversation_id' => $privateUnread->id,
            'private' => true,
            'created_at' => now()->subMinutes(5),
        ]);
        Message::factory()->create([
            'account_id' => $account->id,
            'conversation_id' => $unread->id,
            'created_at' => now()->subMinutes(5),
        ]);
        $privateUnread->forceFill(['last_activity_at' => now()->subMinutes(10)])->save();
        $unread->forceFill(['last_activity_at' => now()->addMinutes(2)])->save();

        $ids = Conversation::query()->sortOnUnread()->pluck('id')->all();

        expect(array_search($privateUnread->id, $ids, true))->toBeLessThan(array_search($unread->id, $ids, true));
    });

    it('lastUserMessageAt orders incoming conversations before answered ones', function () {
        $base = conversationBase();
        [$account] = $base;
        $waitingForReply = conversationIn($base);
        $answered = conversationIn($base);

        Message::factory()->create([
            'account_id' => $account->id,
            'conversation_id' => $answered->id,
            'created_at' => now()->subMinutes(5),
        ]);
        Message::factory()->outgoing()->create([
            'account_id' => $account->id,
            'conversation_id' => $answered->id,
            'created_at' => now()->subMinutes(4),
        ]);
        Message::factory()->create([
            'account_id' => $account->id,
            'conversation_id' => $waitingForReply->id,
            'created_at' => now()->subMinute(),
        ]);

        $ids = Conversation::query()->lastUserMessageAt()->pluck('id')->all();

        expect($ids)->toBe([$waitingForReply->id, $answered->id]);
    });
});
