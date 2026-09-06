<?php

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Jobs\WebhookJob;
use App\Models\Account;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;
use App\Models\Webhook;
use App\Services\Webhooks\Trigger;
use Illuminate\Support\Facades\Queue;

// Port từ spec/listeners/webhook_listener_spec.rb.

beforeEach(function () {
    Queue::fake();
    $this->account = Account::factory()->create();
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
    ]);
    $this->webhook = Webhook::factory()->create([
        'account_id' => $this->account->id,
        'url' => 'https://example.com/hook',
        'subscriptions' => ['conversation_created', 'message_created', 'contact_updated', 'conversation_typing_on'],
    ]);
});

it('gửi webhook cho sự kiện đã đăng ký, kèm secret và mã giao hàng', function () {
    DomainEvent::dispatch(EventType::CONVERSATION_CREATED, ['conversation' => $this->conversation]);

    Queue::assertPushed(WebhookJob::class, function (WebhookJob $job) {
        return $job->url === 'https://example.com/hook'
            && $job->webhookType === Trigger::TYPE_ACCOUNT
            && $job->secret === $this->webhook->secret
            && filled($job->deliveryId)
            && $job->payload['event'] === 'conversation_created'
            && $job->payload['account'] === ['id' => $this->account->id, 'name' => $this->account->name];
    });
});

it('bỏ qua sự kiện không nằm trong subscriptions', function () {
    DomainEvent::dispatch(EventType::CONVERSATION_RESOLVED, ['conversation' => $this->conversation]);

    Queue::assertNotPushed(WebhookJob::class);
});

it('không gửi tin activity (webhook_sendable?)', function () {
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

it('gửi payload tin nhắn với nội dung đã chuẩn hoá', function () {
    $message = Message::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
        'conversation_id' => $this->conversation->id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => "dòng một\\\ndòng hai\n",
    ]);

    Queue::fake();
    DomainEvent::dispatch(EventType::MESSAGE_CREATED, ['message' => $message]);

    Queue::assertPushed(WebhookJob::class, fn (WebhookJob $job) => $job->payload['event'] === 'message_created'
        && $job->payload['content'] === "dòng một\ndòng hai"
        && $job->payload['message_type'] === 'outgoing'
        && $job->payload['inbox'] === ['id' => $this->inbox->id, 'name' => $this->inbox->name]);
});

it('bỏ qua contact_updated khi không có thuộc tính nào đổi', function () {
    $contact = Contact::factory()->create(['account_id' => $this->account->id]);

    DomainEvent::dispatch(EventType::CONTACT_UPDATED, ['contact' => $contact]);
    Queue::assertNotPushed(WebhookJob::class);

    DomainEvent::dispatch(EventType::CONTACT_UPDATED, [
        'contact' => $contact,
        'changed_attributes' => ['name' => ['cũ', 'mới']],
    ]);
    Queue::assertPushed(WebhookJob::class, fn (WebhookJob $job) => $job->payload['event'] === 'contact_updated'
        && $job->payload['changed_attributes'] === [['name' => ['previous_value' => 'cũ', 'current_value' => 'mới']]]);
});

it('gửi trạng thái đang gõ kèm hội thoại và cờ riêng tư', function () {
    $user = User::factory()->create();

    DomainEvent::dispatch(EventType::CONVERSATION_TYPING_ON, [
        'conversation' => $this->conversation,
        'user' => $user,
        'is_private' => true,
    ]);

    Queue::assertPushed(WebhookJob::class, fn (WebhookJob $job) => $job->payload['event'] === 'conversation_typing_on'
        && $job->payload['is_private'] === true
        && $job->payload['user']['type'] === 'user'
        && $job->payload['conversation']['id'] === $this->conversation->display_id);
});

it('không gửi gì khi account tắt cờ api_and_webhooks', function () {
    $this->account->forceFill(['feature_flags' => ['api_and_webhooks' => false]])->save();

    $conversation = Conversation::query()->findOrFail($this->conversation->id);

    DomainEvent::dispatch(EventType::CONVERSATION_CREATED, ['conversation' => $conversation]);

    Queue::assertNotPushed(WebhookJob::class);
});

it('gửi thêm webhook của kênh API khi inbox có webhook_url', function () {
    $inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $inbox->channel->update(['webhook_url' => 'https://example.com/channel']);
    $contactInbox = ContactInbox::factory()->create(['inbox_id' => $inbox->id]);

    Queue::fake();
    DomainEvent::dispatch(EventType::WEBWIDGET_TRIGGERED, [
        'contact_inbox' => $contactInbox,
        'event_info' => ['referer' => 'https://example.com'],
    ]);

    Queue::assertPushed(
        WebhookJob::class,
        fn (WebhookJob $job) => $job->webhookType === Trigger::TYPE_API_INBOX
            && $job->url === 'https://example.com/channel'
    );
});
