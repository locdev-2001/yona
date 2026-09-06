<?php

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Jobs\Integrations\HookJob;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Integrations\Hook;
use App\Models\Message;
use App\Services\Integrations\Contracts\EventProcessor;
use Illuminate\Support\Facades\Queue;

// Port từ spec/listeners/hook_listener_spec.rb. Driver giả cắm qua config để lõi
// vẫn không biết tên app nào — đúng cơ chế thật.
class FakeEventProcessor implements EventProcessor
{
    public static array $processed = [];

    public function supportedEvents(): array
    {
        return ['message.created', 'message.updated', 'contact.updated', 'conversation.created', 'conversation.resolved'];
    }

    public function process(Hook $hook, string $eventName, array $eventData): void
    {
        self::$processed[] = [$hook->id, $eventName];
    }
}

beforeEach(function () {
    Queue::fake();
    FakeEventProcessor::$processed = [];
    config(['integration.apps.slack.event_processor' => FakeEventProcessor::class]);

    $this->account = Account::factory()->create();
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
    ]);
    $this->hook = Hook::factory()->create(['account_id' => $this->account->id, 'app_id' => 'slack']);
});

it('đẩy sự kiện tin nhắn tới hook của app có driver', function () {
    $message = Message::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'conversation_id' => $this->conversation->id,
    ]);

    DomainEvent::dispatch(EventType::MESSAGE_CREATED, ['message' => $message]);

    Queue::assertPushed(HookJob::class, function (HookJob $job) use ($message) {
        return $job->hook->id === $this->hook->id
            && $job->eventName === 'message.created'
            && $job->eventData['message']->id === $message->id;
    });
});

it('mang theo previous_changes của message.updated', function () {
    $message = Message::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'conversation_id' => $this->conversation->id,
    ]);

    DomainEvent::dispatch(EventType::MESSAGE_UPDATED, [
        'message' => $message,
        'previous_changes' => ['content_attributes' => [null, ['submitted_values' => []]]],
    ]);

    Queue::assertPushed(HookJob::class, fn (HookJob $job) => array_key_exists(
        'content_attributes',
        $job->eventData['previous_changes'] ?? [],
    ));
});

it('bỏ qua hook đang tắt', function () {
    $this->hook->disable();

    $message = Message::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'conversation_id' => $this->conversation->id,
    ]);

    DomainEvent::dispatch(EventType::MESSAGE_CREATED, ['message' => $message]);

    Queue::assertNotPushed(HookJob::class);
});

it('bỏ qua hook của app không có driver', function () {
    config(['integration.apps.slack.event_processor' => null]);

    $message = Message::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'conversation_id' => $this->conversation->id,
    ]);

    DomainEvent::dispatch(EventType::MESSAGE_CREATED, ['message' => $message]);

    Queue::assertNotPushed(HookJob::class);
});

it('không chạy hook gắn inbox khác với inbox của tin nhắn', function () {
    $otherInbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $this->hook->update(['inbox_id' => $otherInbox->id, 'hook_type' => Hook::TYPE_INBOX]);

    $message = Message::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'conversation_id' => $this->conversation->id,
    ]);

    DomainEvent::dispatch(EventType::MESSAGE_CREATED, ['message' => $message]);

    Queue::assertNotPushed(HookJob::class);
});

it('chỉ đẩy sự kiện account tới hook kiểu account', function () {
    $contact = Contact::factory()->create(['account_id' => $this->account->id]);

    DomainEvent::dispatch(EventType::CONTACT_UPDATED, ['contact' => $contact]);
    Queue::assertPushed(HookJob::class, 1);

    $this->hook->update(['hook_type' => Hook::TYPE_INBOX, 'inbox_id' => $this->inbox->id]);
    DomainEvent::dispatch(EventType::CONTACT_UPDATED, ['contact' => $contact]);
    Queue::assertPushed(HookJob::class, 1);
});

it('conversation_resolved chỉ chạy khi hội thoại thật sự resolved', function () {
    DomainEvent::dispatch(EventType::CONVERSATION_RESOLVED, ['conversation' => $this->conversation]);
    Queue::assertNotPushed(HookJob::class);

    $this->conversation->status = Conversation::STATUS_RESOLVED;
    $this->conversation->saveQuietly();
    DomainEvent::dispatch(EventType::CONVERSATION_RESOLVED, ['conversation' => $this->conversation]);
    Queue::assertPushed(HookJob::class, 1);
});

it('bỏ qua sự kiện app không đăng ký', function () {
    DomainEvent::dispatch(EventType::CONTACT_CREATED, ['contact' => Contact::factory()->create([
        'account_id' => $this->account->id,
    ])]);

    Queue::assertNotPushed(HookJob::class);
});

it('HookJob giao việc cho driver của app', function () {
    $message = Message::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'conversation_id' => $this->conversation->id,
    ]);

    (new HookJob($this->hook, 'message.created', ['message' => $message]))->handle();

    expect(FakeEventProcessor::$processed)->toBe([[$this->hook->id, 'message.created']]);
});
