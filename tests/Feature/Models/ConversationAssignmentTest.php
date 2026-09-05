<?php

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Jobs\AutoAssignment\AssignmentJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\Team;
use App\Models\User;
use App\Support\OnlineStatusTracker;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Redis;

// Port từ spec/models/concerns/assignment_handler_shared.rb +
// auto_assignment_handler_shared.rb và phần assignee/team của conversation_spec.rb.

beforeEach(function () {
    Redis::flushdb();

    $this->account = Account::factory()->create();
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id, 'enable_auto_assignment' => false]);
    $this->agent = assignmentAgent($this->account);
    $this->inbox->inboxMembers()->create(['user_id' => $this->agent->id]);
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
    ]);
});

function assignmentAgent(Account $account): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id]);
    OnlineStatusTracker::updatePresence($account->id, 'User', $user->id);
    OnlineStatusTracker::setStatus($account->id, $user->id, 'online');

    return $user;
}

function disableAssignmentV2(Account $account): void
{
    $account->forceFill(['feature_flags' => ['assignment_v2' => false]])->save();
}

function lastActivityContent(Conversation $conversation): ?string
{
    return $conversation->messages()
        ->where('message_type', Message::TYPE_ACTIVITY)
        ->reorder('id', 'desc')
        ->first()?->content;
}

describe('ensure assignee is from team', function () {
    it('clears an assignee who is not a member of the assigned team', function () {
        $team = Team::factory()->create(['account_id' => $this->account->id, 'allow_auto_assign' => false]);
        $this->conversation->update(['assignee_id' => $this->agent->id]);

        $this->conversation->update(['team_id' => $team->id]);

        expect($this->conversation->refresh()->assignee_id)->toBeNull();
    });

    it('picks a team member when the team allows auto assignment', function () {
        $team = Team::factory()->create(['account_id' => $this->account->id, 'allow_auto_assign' => true]);
        $team->addMembers([$this->agent->id]);

        $this->actingAs($this->agent);
        $this->conversation->update(['team_id' => $team->id]);

        expect($this->conversation->refresh()->assignee_id)->toBe($this->agent->id)
            ->and(lastActivityContent($this->conversation))
            ->toBe("Assigned to {$this->agent->name} via {$team->name} by {$this->agent->name}");
    });

    it('keeps an assignee who already belongs to the team', function () {
        $team = Team::factory()->create(['account_id' => $this->account->id, 'allow_auto_assign' => true]);
        $other = assignmentAgent($this->account);
        $this->inbox->inboxMembers()->create(['user_id' => $other->id]);
        $team->addMembers([$this->agent->id, $other->id]);
        $this->conversation->update(['assignee_id' => $other->id]);

        $this->conversation->update(['team_id' => $team->id]);

        expect($this->conversation->refresh()->assignee_id)->toBe($other->id);
    });

    it('leaves the assignee alone when only other columns change', function () {
        $this->conversation->update(['assignee_id' => $this->agent->id]);

        $this->conversation->update(['status' => Conversation::STATUS_PENDING]);

        expect($this->conversation->refresh()->assignee_id)->toBe($this->agent->id);
    });
});

describe('assignment activity messages', function () {
    it('writes team assigned then team removed', function () {
        $team = Team::factory()->create(['account_id' => $this->account->id, 'allow_auto_assign' => false]);
        $this->actingAs($this->agent);

        $this->conversation->update(['team_id' => $team->id]);
        expect(lastActivityContent($this->conversation))->toBe("Assigned to {$team->name} by {$this->agent->name}");

        $this->conversation->update(['team_id' => null]);
        expect(lastActivityContent($this->conversation))->toBe("Unassigned from {$team->name} by {$this->agent->name}");
    });

    it('writes assigned, self assigned and removed for the assignee', function () {
        $other = assignmentAgent($this->account);
        $this->actingAs($this->agent);

        $this->conversation->update(['assignee_id' => $other->id]);
        expect(lastActivityContent($this->conversation))->toBe("Assigned to {$other->name} by {$this->agent->name}");

        $this->conversation->update(['assignee_id' => $this->agent->id]);
        expect(lastActivityContent($this->conversation))->toBe("{$this->agent->name} self-assigned this conversation");

        $this->conversation->update(['assignee_id' => null]);
        expect(lastActivityContent($this->conversation))->toBe("Conversation unassigned by {$this->agent->name}");
    });

    it('writes no activity when nobody is behind the change', function () {
        $this->conversation->update(['assignee_id' => $this->agent->id]);

        expect(lastActivityContent($this->conversation))->toBeNull();
    });
});

describe('assignment events', function () {
    it('dispatches assignee changed and conversation updated', function () {
        Event::fake([DomainEvent::class]);

        $this->conversation->update(['assignee_id' => $this->agent->id]);

        Event::assertDispatched(DomainEvent::class, fn (DomainEvent $event) => $event->type === EventType::ASSIGNEE_CHANGED
            && $event->data['conversation']->id === $this->conversation->id
            && $event->data['changed_attributes']['assignee_id'] === [null, $this->agent->id]);
        Event::assertDispatched(DomainEvent::class, fn (DomainEvent $event) => $event->type === EventType::CONVERSATION_UPDATED);
    });

    it('dispatches team changed', function () {
        $team = Team::factory()->create(['account_id' => $this->account->id, 'allow_auto_assign' => false]);
        Event::fake([DomainEvent::class]);

        $this->conversation->update(['team_id' => $team->id]);

        Event::assertDispatched(DomainEvent::class, fn (DomainEvent $event) => $event->type === EventType::TEAM_CHANGED
            && $event->data['conversation']->id === $this->conversation->id);
    });

    it('does not dispatch assignee changed when nothing about assignment moved', function () {
        Event::fake([DomainEvent::class]);

        $this->conversation->update(['priority' => Conversation::PRIORITY_HIGH]);

        Event::assertNotDispatched(DomainEvent::class, fn (DomainEvent $event) => $event->type === EventType::ASSIGNEE_CHANGED
            || $event->type === EventType::TEAM_CHANGED);
    });
});

describe('legacy auto assignment (V1)', function () {
    beforeEach(function () {
        disableAssignmentV2($this->account);
        $this->inbox->update(['enable_auto_assignment' => true]);
        $this->inbox->refresh();
    });

    it('assigns an online agent when the conversation is created', function () {
        $conversation = Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
        ]);

        expect($conversation->refresh()->assignee_id)->toBe($this->agent->id);
    });

    it('does not assign when auto assignment is off on the inbox', function () {
        $this->inbox->update(['enable_auto_assignment' => false]);

        $conversation = Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->fresh()->id,
        ]);

        expect($conversation->refresh()->assignee_id)->toBeNull();
    });

    it('does not assign a pending conversation', function () {
        $conversation = Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'status' => Conversation::STATUS_PENDING,
        ]);

        expect($conversation->refresh()->assignee_id)->toBeNull();
    });

    it('assigns in the same save when the conversation reopens', function () {
        $conversation = Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'status' => Conversation::STATUS_PENDING,
        ]);

        $conversation->update(['status' => Conversation::STATUS_OPEN]);

        expect($conversation->refresh()->assignee_id)->toBe($this->agent->id)
            ->and($conversation->wasChanged('status'))->toBeTrue();
    });
});

describe('auto assignment V2', function () {
    beforeEach(function () {
        $this->inbox->update(['enable_auto_assignment' => true]);
        $this->inbox->refresh();
        Queue::fake();
    });

    it('queues the inbox assignment job when a conversation opens', function () {
        Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
        ]);

        Queue::assertPushed(AssignmentJob::class, fn (AssignmentJob $job) => $job->inboxId === $this->inbox->id);
    });

    it('queues the job again when a conversation is resolved so capacity is redistributed', function () {
        $conversation = Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'assignee_id' => $this->agent->id,
        ]);
        Redis::del(sprintf(AssignmentJob::AUTO_ASSIGNMENT_IN_FLIGHT_KEY, $this->inbox->id));

        $conversation->update(['status' => Conversation::STATUS_RESOLVED]);

        Queue::assertPushed(AssignmentJob::class, fn (AssignmentJob $job) => $job->inboxId === $this->inbox->id);
    });

    it('does not queue the job when auto assignment is off', function () {
        $this->inbox->update(['enable_auto_assignment' => false]);

        Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->fresh()->id,
        ]);

        Queue::assertNotPushed(AssignmentJob::class);
    });
});
