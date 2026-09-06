<?php

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Jobs\AgentBots\WebhookJob;
use App\Models\Account;
use App\Models\AgentBot;
use App\Models\AgentBotInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Webhooks\Trigger;
use Illuminate\Support\Facades\Queue;

// Port từ spec/listeners/agent_bot_listener_spec.rb.

beforeEach(function () {
    Queue::fake();
    $this->account = Account::factory()->create();
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $this->bot = AgentBot::factory()->create([
        'account_id' => $this->account->id,
        'outgoing_url' => 'https://example.com/bot',
    ]);
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
    ]);
});

it('gửi sự kiện tới bot đang bật của inbox', function () {
    AgentBotInbox::query()->create(['inbox_id' => $this->inbox->id, 'agent_bot_id' => $this->bot->id]);

    DomainEvent::dispatch(EventType::CONVERSATION_RESOLVED, [
        'conversation' => Conversation::query()->findOrFail($this->conversation->id),
    ]);

    Queue::assertPushed(WebhookJob::class, fn (WebhookJob $job) => $job->url === 'https://example.com/bot'
        && $job->webhookType === Trigger::TYPE_AGENT_BOT
        && $job->secret === $this->bot->secret
        && $job->payload['event'] === 'conversation_resolved');
});

it('không gửi khi liên kết bot–inbox đang tắt', function () {
    AgentBotInbox::query()->create([
        'inbox_id' => $this->inbox->id,
        'agent_bot_id' => $this->bot->id,
        'status' => AgentBotInbox::STATUS_INACTIVE,
    ]);

    DomainEvent::dispatch(EventType::CONVERSATION_RESOLVED, [
        'conversation' => Conversation::query()->findOrFail($this->conversation->id),
    ]);

    Queue::assertNotPushed(WebhookJob::class);
});

it('gửi tới bot được gán cho hội thoại dù inbox chưa gắn bot', function () {
    $this->conversation->forceFill(['assignee_agent_bot_id' => $this->bot->id])->save();
    Queue::fake();

    DomainEvent::dispatch(EventType::CONVERSATION_OPENED, [
        'conversation' => Conversation::query()->findOrFail($this->conversation->id),
    ]);

    Queue::assertPushed(WebhookJob::class, 1);
});

it('không gửi trùng khi bot của hội thoại cũng là bot của inbox', function () {
    AgentBotInbox::query()->create(['inbox_id' => $this->inbox->id, 'agent_bot_id' => $this->bot->id]);
    $this->conversation->forceFill(['assignee_agent_bot_id' => $this->bot->id])->save();
    Queue::fake();

    DomainEvent::dispatch(EventType::CONVERSATION_OPENED, [
        'conversation' => Conversation::query()->findOrFail($this->conversation->id),
    ]);

    Queue::assertPushed(WebhookJob::class, 1);
});

it('bỏ qua bot không khai outgoing_url và tin activity', function () {
    $bot = AgentBot::factory()->create(['account_id' => $this->account->id, 'outgoing_url' => null]);
    AgentBotInbox::query()->create(['inbox_id' => $this->inbox->id, 'agent_bot_id' => $bot->id]);

    DomainEvent::dispatch(EventType::CONVERSATION_RESOLVED, [
        'conversation' => Conversation::query()->findOrFail($this->conversation->id),
    ]);
    Queue::assertNotPushed(WebhookJob::class);

    $message = Message::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'conversation_id' => $this->conversation->id,
        'message_type' => Message::TYPE_ACTIVITY,
    ]);

    Queue::fake();
    DomainEvent::dispatch(EventType::MESSAGE_CREATED, ['message' => $message]);
    Queue::assertNotPushed(WebhookJob::class);
});
