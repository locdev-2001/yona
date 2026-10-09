<?php

use App\Jobs\Conversations\SweepOutboundOrderJob;
use App\Jobs\SendReplyJob;
use App\Messaging\Delivery\OutboundOrder;
use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;

// Thứ tự gửi ra kênh trong một hội thoại = thứ tự tạo tin, dù tin tệp và tin chữ
// chạy ở hai hàng đợi khác nhau. Queue giả để tự quyết job nào chạy lúc nào, như
// hai worker nhận việc lệch nhau.

function outboundOrderConversation(): Conversation
{
    $inbox = Inbox::factory()->zalo()->create();

    return Conversation::factory()->create([
        'account_id' => $inbox->account_id,
        'inbox_id' => $inbox->id,
        'additional_attributes' => ['thread_id' => '9876543210', 'thread_type' => 0],
    ]);
}

function outboundOrderMessage(Conversation $conversation, string $content, bool $withImage = false): Message
{
    $message = new Message([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'conversation_id' => $conversation->id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => $content,
    ]);

    if ($withImage) {
        $message->pendingAttachments = [new Attachment([
            'account_id' => $conversation->account_id,
            'file_type' => Attachment::FILE_TYPE_IMAGE,
            'external_url' => 'https://cdn.example.test/anh.jpg',
            'filename' => 'anh.jpg',
            'content_type' => 'image/jpeg',
            'byte_size' => 2048,
        ])];
    }

    $message->save();

    return $message;
}

/** @return list<int> id các tin đang có job trong hàng đợi, theo thứ tự đẩy vào. */
function outboundOrderPushedIds(): array
{
    return Queue::pushed(SendReplyJob::class)->map(fn (SendReplyJob $job) => $job->message->id)->values()->all();
}

function outboundOrderRun(int $messageId): void
{
    Queue::pushed(SendReplyJob::class)
        ->first(fn (SendReplyJob $job) => $job->message->id === $messageId)
        ->handle();
}

/** @return list<string> Nội dung chữ bridge nhận, theo thứ tự gọi (tệp đi lượt riêng, không mang chữ). */
function outboundOrderBridgeTexts(): array
{
    return collect(Http::recorded())
        ->filter(fn (array $pair) => str_ends_with($pair[0]->url(), '/personal-messages/send') && isset($pair[0]->data()['text']))
        ->map(fn (array $pair) => $pair[0]->data()['text'])
        ->values()
        ->all();
}

// Http::fake chọn stub khai ĐẦU TIÊN khớp, nên mỗi test tự khai bridge của mình.
function outboundOrderBridgeAccepts(): void
{
    Http::fake([
        zaloBridgePattern('personal-messages/send') => Http::response(['ok' => true, 'source_id' => 'zalo-'.uniqid()]),
        zaloBridgePattern('*') => Http::response(['ok' => true]),
    ]);
}

beforeEach(fn () => Queue::fake());

it('tin chữ tạo sau ảnh chỉ vào hàng đợi khi ảnh đã gửi xong, kênh nhận đúng thứ tự', function () {
    outboundOrderBridgeAccepts();
    $conversation = outboundOrderConversation();
    $image = outboundOrderMessage($conversation, 'Ảnh mẫu', withImage: true);
    $text = outboundOrderMessage($conversation, 'Giá 450.000đ');

    expect(outboundOrderPushedIds())->toBe([$image->id]);

    outboundOrderRun($image->id);
    expect(outboundOrderPushedIds())->toBe([$image->id, $text->id]);

    outboundOrderRun($text->id);
    expect(outboundOrderBridgeTexts())->toBe(['Ảnh mẫu', 'Giá 450.000đ']);
});

it('hai tin tệp liên tiếp cùng hội thoại không chạy song song trên hai worker media', function () {
    outboundOrderBridgeAccepts();
    $conversation = outboundOrderConversation();
    $first = outboundOrderMessage($conversation, 'Ảnh 1', withImage: true);
    $second = outboundOrderMessage($conversation, 'Ảnh 2', withImage: true);
    $third = outboundOrderMessage($conversation, 'Ảnh 3', withImage: true);

    expect(outboundOrderPushedIds())->toBe([$first->id]);

    outboundOrderRun($first->id);
    outboundOrderRun($second->id);
    outboundOrderRun($third->id);

    expect(outboundOrderPushedIds())->toBe([$first->id, $second->id, $third->id])
        ->and(outboundOrderBridgeTexts())->toBe(['Ảnh 1', 'Ảnh 2', 'Ảnh 3']);
});

it('tin trước gửi hỏng vẫn nhả hàng cho tin sau', function () {
    Http::fake([zaloBridgePattern('personal-messages/send') => Http::response(['ok' => false, 'code' => 'zalo_rejected'], 422)]);
    $conversation = outboundOrderConversation();
    $failing = outboundOrderMessage($conversation, 'Tin hỏng');
    $next = outboundOrderMessage($conversation, 'Tin sau');

    outboundOrderRun($failing->id);

    expect($failing->refresh()->status)->toBe(Message::STATUSES['failed'])
        ->and(outboundOrderPushedIds())->toBe([$failing->id, $next->id]);
});

it('job hỏng sau lượt thử cuối nhả hàng, lượt thử lại giữa chừng thì không', function () {
    outboundOrderBridgeAccepts();
    $conversation = outboundOrderConversation();
    $failing = outboundOrderMessage($conversation, 'Tin lỗi');
    $next = outboundOrderMessage($conversation, 'Tin sau');
    $job = Queue::pushed(SendReplyJob::class)->first();

    Http::fake(fn () => throw new RuntimeException('worker chết giữa lượt gửi'));
    expect(fn () => $job->handle())->toThrow(RuntimeException::class);
    expect(outboundOrderPushedIds())->toBe([$failing->id]);

    $job->failed(new RuntimeException('hết lượt thử'));
    expect(outboundOrderPushedIds())->toBe([$failing->id, $next->id]);
});

it('hai hội thoại khác nhau không chặn nhau', function () {
    outboundOrderBridgeAccepts();
    $first = outboundOrderMessage(outboundOrderConversation(), 'Hội thoại A', withImage: true);
    $second = outboundOrderMessage(outboundOrderConversation(), 'Hội thoại B');

    expect(outboundOrderPushedIds())->toBe([$first->id, $second->id]);
});

it('job đầu hàng mất hẳn thì lượt quét nhả hàng sau khi quá hạn, không sớm hơn', function () {
    outboundOrderBridgeAccepts();
    $conversation = outboundOrderConversation();
    $lost = outboundOrderMessage($conversation, 'Job mất');
    $next = outboundOrderMessage($conversation, 'Tin sau');
    $sweep = fn () => (new SweepOutboundOrderJob)->handle(app(OutboundOrder::class));

    $this->travel(OutboundOrder::STALE_AFTER_SECONDS - 60)->seconds();
    $sweep();
    expect(outboundOrderPushedIds())->toBe([$lost->id]);

    $this->travel(120)->seconds();
    $sweep();
    expect(outboundOrderPushedIds())->toBe([$lost->id, $next->id]);

    // Job mất rồi chạy lại muộn cũng không làm hỏng hàng của tin đang đứng đầu.
    outboundOrderRun($lost->id);
    expect(outboundOrderPushedIds())->toBe([$lost->id, $next->id]);
});

it('tin riêng tư và tin đến không xếp hàng', function () {
    outboundOrderBridgeAccepts();
    $conversation = outboundOrderConversation();
    outboundOrderMessage($conversation, 'Đang gửi', withImage: true);
    $note = $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'private' => true,
        'content' => 'Ghi chú',
    ]);

    expect(outboundOrderPushedIds())->toContain($note->id);
});
