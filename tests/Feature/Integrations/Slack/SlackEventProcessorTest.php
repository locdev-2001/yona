<?php

use App\Jobs\Integrations\SendOnSlackJob;
use App\Jobs\Integrations\UpdateSlackMessageJob;
use App\Models\Integrations\Hook;
use App\Models\Message;
use App\Services\Integrations\Slack\SlackEventProcessor;
use Illuminate\Support\Facades\Queue;

it('khai đúng 2 sự kiện được hỗ trợ', function () {
    expect((new SlackEventProcessor)->supportedEvents())->toBe(['message.created', 'message.updated']);
});

it('message.created bắn SendOnSlackJob ngay khi tin không có tệp đính kèm', function () {
    Queue::fake();
    $hook = Hook::factory()->create();
    $message = Message::factory()->create(['account_id' => $hook->account_id]);

    (new SlackEventProcessor)->process($hook, 'message.created', ['message' => $message]);

    Queue::assertPushed(SendOnSlackJob::class, fn ($job) => $job->message->is($message) && $job->hook->is($hook));
});

it('message.updated chỉ bắn UpdateSlackMessageJob khi content_type hỗ trợ VÀ content_attributes vừa đổi', function () {
    Queue::fake();
    $hook = Hook::factory()->create();
    $message = Message::factory()->create([
        'account_id' => $hook->account_id,
        'content_type' => Message::CONTENT_TYPES['input_select'],
    ]);

    (new SlackEventProcessor)->process($hook, 'message.updated', [
        'message' => $message,
        'previous_changes' => ['content_attributes' => [[], ['submitted_values' => []]]],
    ]);

    Queue::assertPushed(UpdateSlackMessageJob::class);
});

it('message.updated bỏ qua khi content_type không thuộc danh sách tương tác', function () {
    Queue::fake();
    $hook = Hook::factory()->create();
    $message = Message::factory()->create([
        'account_id' => $hook->account_id,
        'content_type' => Message::CONTENT_TYPES['text'],
    ]);

    (new SlackEventProcessor)->process($hook, 'message.updated', [
        'message' => $message,
        'previous_changes' => ['content_attributes' => [[], []]],
    ]);

    Queue::assertNotPushed(UpdateSlackMessageJob::class);
});

it('message.updated bỏ qua khi content_attributes không nằm trong previous_changes', function () {
    Queue::fake();
    $hook = Hook::factory()->create();
    $message = Message::factory()->create([
        'account_id' => $hook->account_id,
        'content_type' => Message::CONTENT_TYPES['input_select'],
    ]);

    (new SlackEventProcessor)->process($hook, 'message.updated', [
        'message' => $message,
        'previous_changes' => ['status' => [0, 1]],
    ]);

    Queue::assertNotPushed(UpdateSlackMessageJob::class);
});
