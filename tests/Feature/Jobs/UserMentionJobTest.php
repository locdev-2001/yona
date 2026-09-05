<?php

use App\Jobs\Conversations\UserMentionJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Mention;
use App\Models\Message;
use App\Models\User;

// Port từ Conversations::UserMentionJob (Chatwoot không có spec riêng cho job này).

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
    ]);
    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);
    $this->inbox->addMembers([$this->agent->id]);
});

it('creates one mention per user', function () {
    (new UserMentionJob([$this->agent->id], $this->conversation->id, $this->account->id))->handle();

    $mention = Mention::query()->sole();

    expect($mention->user_id)->toBe($this->agent->id)
        ->and($mention->conversation_id)->toBe($this->conversation->id)
        ->and($mention->account_id)->toBe($this->account->id)
        ->and($mention->mentioned_at)->not->toBeNull();
});

it('moves mentioned_at forward instead of duplicating the mention', function () {
    $mention = Mention::factory()->create([
        'conversation_id' => $this->conversation->id,
        'user_id' => $this->agent->id,
        'mentioned_at' => now()->subDay(),
    ]);

    (new UserMentionJob([$this->agent->id], $this->conversation->id, $this->account->id))->handle();

    expect(Mention::query()->count())->toBe(1)
        ->and($mention->refresh()->mentioned_at->greaterThan(now()->subMinute()))->toBeTrue();
});

it('records a mention when a private message names an agent', function () {
    $author = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $author->id]);
    $this->inbox->addMembers([$author->id]);

    $this->conversation->messages()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'message_type' => Message::TYPE_OUTGOING,
        'private' => true,
        'sender_type' => $author->getMorphClass(),
        'sender_id' => $author->id,
        'content' => "hi [@{$this->agent->name}](mention://user/{$this->agent->id}/{$this->agent->name})",
    ]);

    expect(Mention::query()->where('user_id', $this->agent->id)->exists())->toBeTrue()
        ->and($this->conversation->conversationParticipants()->pluck('user_id')->all())->toBe([$this->agent->id]);
});
