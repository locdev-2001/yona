<?php

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\Inbox;
use App\Models\User;
use Illuminate\Support\Facades\Event;

// Port từ spec/controllers/api/v1/accounts/conversations/participants_controller_spec.rb.

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $contact = Contact::factory()->create(['account_id' => $this->account->id]);
    $contactInbox = ContactInbox::factory()->create(['contact_id' => $contact->id, 'inbox_id' => $this->inbox->id]);
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'contact_id' => $contact->id,
        'contact_inbox_id' => $contactInbox->id,
    ]);

    $this->agent = participantsAgent($this->account, $this->inbox);
});

function participantsAgent(Account $account, Inbox $inbox): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id]);
    $inbox->addMembers([$user->id]);

    return $user;
}

function participantsUrl(Account $account, Conversation $conversation): string
{
    return "/api/v1/accounts/{$account->id}/conversations/{$conversation->display_id}/participants";
}

describe('GET participants', function () {
    it('returns unauthorized for guests', function () {
        $this->getJson(participantsUrl($this->account, $this->conversation))->assertUnauthorized();
    });

    it('returns every participant of the conversation', function () {
        $first = participantsAgent($this->account, $this->inbox);
        $second = participantsAgent($this->account, $this->inbox);
        ConversationParticipant::factory()->create(['conversation_id' => $this->conversation->id, 'user_id' => $first->id]);
        ConversationParticipant::factory()->create(['conversation_id' => $this->conversation->id, 'user_id' => $second->id]);

        $response = $this->actingAs($this->agent)
            ->getJson(participantsUrl($this->account, $this->conversation))
            ->assertOk();

        expect(collect($response->json())->pluck('email')->all())
            ->toBe([$first->email, $second->email]);
    });
});

describe('POST participants', function () {
    it('returns unauthorized for guests', function () {
        $this->postJson(participantsUrl($this->account, $this->conversation))->assertUnauthorized();
    });

    it('creates the participants requested by an authorized agent', function () {
        $participant = participantsAgent($this->account, $this->inbox);

        $response = $this->actingAs($this->agent)
            ->postJson(participantsUrl($this->account, $this->conversation), ['user_ids' => [$participant->id]])
            ->assertOk();

        expect(collect($response->json())->pluck('email')->all())->toBe([$participant->email])
            ->and($this->conversation->conversationParticipants()->count())->toBe(1);
    });

    it('rejects foreign participant ids without exposing user details', function () {
        $participant = participantsAgent($this->account, $this->inbox);
        $foreign = User::factory()->create();
        AccountUser::factory()->create(['account_id' => Account::factory()->create()->id, 'user_id' => $foreign->id]);

        $response = $this->actingAs($this->agent)
            ->postJson(participantsUrl($this->account, $this->conversation), [
                'user_ids' => [$participant->id, $foreign->id],
            ])
            ->assertStatus(422);

        expect($response->json())->toBe(['error' => 'Invalid participant IDs'])
            ->and($response->getContent())->not->toContain($foreign->email)
            ->and($this->conversation->conversationParticipants()->count())->toBe(0);
    });

    it('notifies unread counts when a participant is added', function () {
        $this->account->forceFill(['feature_flags' => ['conversation_unread_counts' => true, 'unread_count_for_filters' => true]])->save();
        $participant = participantsAgent($this->account, $this->inbox);
        Event::fake([DomainEvent::class]);

        $this->actingAs($this->agent)
            ->postJson(participantsUrl($this->account, $this->conversation), ['user_ids' => [$participant->id]])
            ->assertOk();

        Event::assertDispatched(
            DomainEvent::class,
            fn (DomainEvent $event) => $event->type === EventType::CONVERSATION_UNREAD_COUNT_CHANGED
                && $event->data['conversation']->id === $this->conversation->id
        );
    });

    it('does not notify unread counts when the feature flags are off', function () {
        $participant = participantsAgent($this->account, $this->inbox);
        Event::fake([DomainEvent::class]);

        $this->actingAs($this->agent)
            ->postJson(participantsUrl($this->account, $this->conversation), ['user_ids' => [$participant->id]])
            ->assertOk();

        Event::assertNotDispatched(
            DomainEvent::class,
            fn (DomainEvent $event) => $event->type === EventType::CONVERSATION_UNREAD_COUNT_CHANGED
        );
    });
});

describe('PATCH participants', function () {
    it('returns unauthorized for guests', function () {
        $this->patchJson(participantsUrl($this->account, $this->conversation))->assertUnauthorized();
    });

    it('adds the missing participants and removes the extra ones', function () {
        $kept = participantsAgent($this->account, $this->inbox);
        $added = participantsAgent($this->account, $this->inbox);
        $removed = participantsAgent($this->account, $this->inbox);
        ConversationParticipant::factory()->create(['conversation_id' => $this->conversation->id, 'user_id' => $kept->id]);
        ConversationParticipant::factory()->create(['conversation_id' => $this->conversation->id, 'user_id' => $removed->id]);

        $response = $this->actingAs($this->agent)
            ->putJson(participantsUrl($this->account, $this->conversation), ['user_ids' => [$kept->id, $added->id]])
            ->assertOk();

        expect(collect($response->json())->pluck('email')->all())
            ->toEqualCanonicalizing([$kept->email, $added->email])
            ->and($this->conversation->conversationParticipants()->pluck('user_id')->all())
            ->toEqualCanonicalizing([$kept->id, $added->id]);
    });

    it('rejects foreign participant ids without changing existing participants', function () {
        $existing = participantsAgent($this->account, $this->inbox);
        $added = participantsAgent($this->account, $this->inbox);
        $foreign = User::factory()->create();
        ConversationParticipant::factory()->create(['conversation_id' => $this->conversation->id, 'user_id' => $existing->id]);

        $response = $this->actingAs($this->agent)
            ->patchJson(participantsUrl($this->account, $this->conversation), [
                'user_ids' => [$added->id, $foreign->id],
            ])
            ->assertStatus(422);

        expect($response->json())->toBe(['error' => 'Invalid participant IDs'])
            ->and($response->getContent())->not->toContain($foreign->email)
            ->and($this->conversation->conversationParticipants()->pluck('user_id')->all())->toBe([$existing->id]);
    });

    it('notifies unread counts when the membership changes', function () {
        $this->account->forceFill(['feature_flags' => ['conversation_unread_counts' => true, 'unread_count_for_filters' => true]])->save();
        $kept = participantsAgent($this->account, $this->inbox);
        $added = participantsAgent($this->account, $this->inbox);
        ConversationParticipant::factory()->create(['conversation_id' => $this->conversation->id, 'user_id' => $kept->id]);
        Event::fake([DomainEvent::class]);

        $this->actingAs($this->agent)
            ->putJson(participantsUrl($this->account, $this->conversation), ['user_ids' => [$kept->id, $added->id]])
            ->assertOk();

        Event::assertDispatched(
            DomainEvent::class,
            fn (DomainEvent $event) => $event->type === EventType::CONVERSATION_UNREAD_COUNT_CHANGED
        );
    });
});

describe('DELETE participants', function () {
    it('returns unauthorized for guests', function () {
        $this->deleteJson(participantsUrl($this->account, $this->conversation))->assertUnauthorized();
    });

    it('removes the requested participants', function () {
        $participant = participantsAgent($this->account, $this->inbox);
        ConversationParticipant::factory()->create(['conversation_id' => $this->conversation->id, 'user_id' => $participant->id]);

        $this->actingAs($this->agent)
            ->deleteJson(participantsUrl($this->account, $this->conversation), ['user_ids' => [$participant->id]])
            ->assertOk();

        expect($this->conversation->conversationParticipants()->count())->toBe(0);
    });

    it('notifies unread counts when a participant is removed', function () {
        $this->account->forceFill(['feature_flags' => ['conversation_unread_counts' => true, 'unread_count_for_filters' => true]])->save();
        $participant = participantsAgent($this->account, $this->inbox);
        ConversationParticipant::factory()->create(['conversation_id' => $this->conversation->id, 'user_id' => $participant->id]);
        Event::fake([DomainEvent::class]);

        $this->actingAs($this->agent)
            ->deleteJson(participantsUrl($this->account, $this->conversation), ['user_ids' => [$participant->id]])
            ->assertOk();

        Event::assertDispatched(
            DomainEvent::class,
            fn (DomainEvent $event) => $event->type === EventType::CONVERSATION_UNREAD_COUNT_CHANGED
        );
    });
});
