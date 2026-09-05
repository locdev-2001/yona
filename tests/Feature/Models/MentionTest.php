<?php

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Models\Account;
use App\Models\Conversation;
use App\Models\Mention;
use App\Models\Message;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Event;

// Port từ spec/models/mention_spec.rb.

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->userOne = User::factory()->create();
    $this->userTwo = User::factory()->create();

    $this->conversationOne = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'created_at' => now()->subDays(8),
    ]);
    $this->conversationTwo = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'created_at' => now()->subDays(6),
    ]);
    $this->conversationThree = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'created_at' => now()->subDays(9),
    ]);

    $this->mentionOne = Mention::factory()->create(['conversation_id' => $this->conversationOne->id, 'user_id' => $this->userOne->id]);
    $this->mentionTwo = Mention::factory()->create(['conversation_id' => $this->conversationTwo->id, 'user_id' => $this->userOne->id]);
    $this->mentionThree = Mention::factory()->create(['conversation_id' => $this->conversationThree->id, 'user_id' => $this->userOne->id]);
});

it('fills account_id from the conversation', function () {
    expect($this->mentionOne->account_id)->toBe($this->account->id);
});

it('keeps one mention per user and conversation', function () {
    expect(fn () => Mention::factory()->create([
        'conversation_id' => $this->conversationOne->id,
        'user_id' => $this->userOne->id,
    ]))->toThrow(UniqueConstraintViolationException::class);
});

it('dispatches conversation.mentioned to the mentioned user', function () {
    Event::fake([DomainEvent::class]);

    $mention = Mention::factory()->create(['conversation_id' => $this->conversationOne->id, 'user_id' => $this->userTwo->id]);

    Event::assertDispatched(
        DomainEvent::class,
        fn (DomainEvent $event) => $event->type === EventType::CONVERSATION_MENTIONED
            && $event->data['user']->id === $this->userTwo->id
            && $event->data['conversation']->id === $mention->conversation_id
    );
});

it('sorts mentioned conversations on the conversation created_at', function () {
    $records = Mention::query()
        ->join('conversations', 'conversations.id', '=', 'mentions.conversation_id')
        ->orderBy('conversations.created_at')
        ->select('mentions.*')
        ->get();

    expect($records->first()->conversation_id)->toBe($this->conversationThree->id)
        ->and($records->last()->conversation_id)->toBe($this->conversationTwo->id);
});

it('sorts mentioned conversations on the last user message', function () {
    mentionMessage($this->conversationThree, Message::TYPE_INCOMING, now()->subDays(2));
    mentionMessage($this->conversationTwo, Message::TYPE_INCOMING, now()->subDays(6));
    mentionMessage($this->conversationOne, Message::TYPE_OUTGOING, now()->subDays(7));
    mentionMessage($this->conversationOne, Message::TYPE_INCOMING, now()->subDays(8));

    $records = Mention::query()->lastUserMessageAt()->get();

    // Xếp incoming trước outgoing, trong cùng nhóm thì tin cũ hơn lên đầu.
    expect($records->first()->conversation_id)->toBe($this->conversationTwo->id)
        ->and($records->last()->conversation_id)->toBe($this->conversationOne->id)
        ->and($records)->toHaveCount(3);
});

it('sorts conversations on mentioned_at with the newest first', function () {
    $this->mentionThree->forceFill(['mentioned_at' => now()])->save();
    $this->mentionOne->forceFill(['mentioned_at' => now()->subHour()])->save();
    $this->mentionTwo->forceFill(['mentioned_at' => now()->subDay()])->save();

    $records = Mention::query()->latestMentioned()->get();

    expect($records->first()->conversation_id)->toBe($this->conversationThree->id)
        ->and($records->last()->conversation_id)->toBe($this->conversationTwo->id);
});

function mentionMessage(Conversation $conversation, int $messageType, DateTimeInterface $createdAt): Message
{
    return Message::factory()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'conversation_id' => $conversation->id,
        'message_type' => $messageType,
        'created_at' => $createdAt,
    ]);
}
