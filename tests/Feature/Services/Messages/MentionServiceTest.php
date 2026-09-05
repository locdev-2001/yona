<?php

use App\Jobs\Conversations\UserMentionJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\Team;
use App\Models\User;
use App\Services\Messages\MentionService;
use Illuminate\Support\Facades\Queue;

// Port từ spec/services/messages/mention_service_spec.rb.
// Phần NotificationBuilder bỏ: model Notification thuộc nhóm D2.

beforeEach(function () {
    Queue::fake();

    $this->account = Account::factory()->create();
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
    ]);

    $this->firstAgent = mentionAgent($this->account, $this->inbox);
    $this->secondAgent = mentionAgent($this->account, $this->inbox);
    $this->outsider = mentionAgent($this->account, null);
    $this->admin = mentionAgent($this->account, null, AccountUser::ROLE_ADMINISTRATOR);

    $this->team = Team::factory()->create(['account_id' => $this->account->id]);
    $this->team->teamMembers()->create(['user_id' => $this->firstAgent->id]);
    $this->team->teamMembers()->create(['user_id' => $this->secondAgent->id]);
});

function mentionAgent(Account $account, ?Inbox $inbox, int $role = AccountUser::ROLE_AGENT): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id, 'role' => $role]);
    $inbox?->addMembers([$user->id]);

    return $user;
}

function mentionNote(Conversation $conversation, ?string $content, bool $private = true): Message
{
    return Message::factory()->make([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'conversation_id' => $conversation->id,
        'content' => $content,
        'private' => $private,
        'message_type' => Message::TYPE_OUTGOING,
    ]);
}

function mentionOf(User $user): string
{
    return "[@{$user->name}](mention://user/{$user->id}/{$user->name})";
}

it('ignores public messages', function () {
    $message = mentionNote($this->conversation, 'hi '.mentionOf($this->firstAgent), private: false);

    (new MentionService($message))->perform();

    Queue::assertNotPushed(UserMentionJob::class);
    expect($this->conversation->conversationParticipants()->count())->toBe(0);
});

it('ignores messages without content', function () {
    (new MentionService(mentionNote($this->conversation, null)))->perform();

    Queue::assertNotPushed(UserMentionJob::class);
});

it('ignores messages without a mention', function () {
    (new MentionService(mentionNote($this->conversation, 'just a regular message')))->perform();

    Queue::assertNotPushed(UserMentionJob::class);
});

it('queues the mention job and adds the mentioned user as a participant', function () {
    $message = mentionNote($this->conversation, 'hi '.mentionOf($this->firstAgent));

    (new MentionService($message))->perform();

    Queue::assertPushed(
        UserMentionJob::class,
        fn (UserMentionJob $job) => $job->mentionedUserIds === [$this->firstAgent->id]
            && $job->conversationId === $this->conversation->id
            && $job->accountId === $this->account->id
    );
    expect($this->conversation->conversationParticipants()->pluck('user_id')->all())->toBe([$this->firstAgent->id]);
});

it('handles several mentions in one message', function () {
    $content = 'hey '.mentionOf($this->secondAgent).' and '.mentionOf($this->firstAgent).', please look into this?';

    (new MentionService(mentionNote($this->conversation, $content)))->perform();

    Queue::assertPushed(
        UserMentionJob::class,
        fn (UserMentionJob $job) => collect($job->mentionedUserIds)->sort()->values()->all()
            === collect([$this->firstAgent->id, $this->secondAgent->id])->sort()->values()->all()
    );
    expect($this->conversation->conversationParticipants()->pluck('user_id')->all())
        ->toEqualCanonicalizing([$this->firstAgent->id, $this->secondAgent->id]);
});

it('deduplicates a user mentioned more than once', function () {
    $content = 'hi '.mentionOf($this->firstAgent).' and again '.mentionOf($this->firstAgent);

    (new MentionService(mentionNote($this->conversation, $content)))->perform();

    Queue::assertPushed(
        UserMentionJob::class,
        fn (UserMentionJob $job) => $job->mentionedUserIds === [$this->firstAgent->id]
    );
});

it('skips users who are neither inbox members nor administrators', function () {
    (new MentionService(mentionNote($this->conversation, 'hi '.mentionOf($this->outsider))))->perform();

    Queue::assertNotPushed(UserMentionJob::class);
    expect($this->conversation->conversationParticipants()->count())->toBe(0);
});

it('accepts administrators even when they are not inbox members', function () {
    (new MentionService(mentionNote($this->conversation, 'hi '.mentionOf($this->admin))))->perform();

    Queue::assertPushed(
        UserMentionJob::class,
        fn (UserMentionJob $job) => $job->mentionedUserIds === [$this->admin->id]
    );
});

it('expands a team mention into its members who can see the inbox', function () {
    $outsiderTeamMember = mentionAgent($this->account, null);
    $this->team->teamMembers()->create(['user_id' => $outsiderTeamMember->id]);
    $content = "hey [@{$this->team->name}](mention://team/{$this->team->id}/{$this->team->name}) please help";

    (new MentionService(mentionNote($this->conversation, $content)))->perform();

    Queue::assertPushed(
        UserMentionJob::class,
        fn (UserMentionJob $job) => collect($job->mentionedUserIds)->sort()->values()->all()
            === collect([$this->firstAgent->id, $this->secondAgent->id])->sort()->values()->all()
    );
    expect($this->conversation->conversationParticipants()->pluck('user_id')->all())
        ->toEqualCanonicalizing([$this->firstAgent->id, $this->secondAgent->id]);
});
