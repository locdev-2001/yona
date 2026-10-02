<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\Notification;
use App\Models\User;
use App\Services\Conversations\UnreadCounts\AttentionCounter;

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id, 'role' => AccountUser::ROLE_AGENT]);
    $this->agentInbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $this->agentInbox->members()->attach($this->agent->id);
    $this->otherInbox = Inbox::factory()->create(['account_id' => $this->account->id]);
});

function attentionConversation(Inbox $inbox, array $attributes = []): Conversation
{
    return Conversation::factory()->create(['account_id' => $inbox->account_id, 'inbox_id' => $inbox->id, ...$attributes]);
}

function withIncomingMessage(Conversation $conversation): Conversation
{
    Message::factory()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'conversation_id' => $conversation->id,
    ]);

    return $conversation;
}

function notifyAbout(Conversation $conversation, User $user, array $attributes = []): Notification
{
    return Notification::factory()->create([
        'account_id' => $conversation->account_id,
        'user_id' => $user->id,
        'primary_actor_id' => $conversation->id,
        ...$attributes,
    ]);
}

it('counts each conversation needing the agent once, whether unread, notified, or both', function () {
    withIncomingMessage(attentionConversation($this->agentInbox));
    $unreadAndNotified = withIncomingMessage(attentionConversation($this->agentInbox));
    notifyAbout($unreadAndNotified, $this->agent);
    $readButMentioned = withIncomingMessage(attentionConversation($this->agentInbox));
    $readButMentioned->forceFill(['agent_last_seen_at' => now()->addMinute()])->save();
    notifyAbout($readButMentioned, $this->agent);

    withIncomingMessage(attentionConversation($this->otherInbox));
    withIncomingMessage(attentionConversation($this->agentInbox))->forceFill(['status' => Conversation::STATUS_RESOLVED])->save();
    notifyAbout(attentionConversation($this->agentInbox), $this->agent, ['read_at' => now()]);
    notifyAbout(attentionConversation($this->agentInbox), $this->agent, ['snoozed_until' => now()->addHour()]);

    $counter = new AttentionCounter($this->account, $this->agent);
    expect($counter->count())->toBe(3);

    $unreadAndNotified->forceFill(['agent_last_seen_at' => now()->addMinute()])->save();
    Notification::query()->where('primary_actor_id', $unreadAndNotified->id)->update(['read_at' => now()]);

    expect($counter->count())->toBe(2);
});

it('is zero for a user outside the account', function () {
    withIncomingMessage(attentionConversation($this->agentInbox));

    expect((new AttentionCounter($this->account, User::factory()->create()))->count())->toBe(0);
});
