<?php

use App\Messaging\Delivery\DeliveryLevel;
use App\Messaging\Delivery\DeliveryPlanner;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use Illuminate\Support\Facades\Http;

// Ma trận content_type × kênh của DeliveryPlanner (phase-06 §6a). FB/Telegram/LINE khai
// OutboundQuickReply nên input_select ra chip gốc; Zalo/SMS không khai gì hạ xuống chữ
// đánh số; loại chưa có renderer gốc (buttons, cards) luôn hạ xuống chữ dù kênh nào.

// Tạo tin outgoing tự dispatch SendReplyJob thật (Message::booted); các test ở đây chỉ
// quan tâm DeliveryPlanner nên fake mọi request ra ngoài, không quan tâm kênh gửi thế nào.
beforeEach(function () {
    app()->setLocale('vi');
    Http::fake();
});

function planFor(Inbox $inbox, string $contentType, array $attributes, ?string $content = null): Message
{
    $conversation = Conversation::factory()->create(['account_id' => $inbox->account_id, 'inbox_id' => $inbox->id]);

    return $conversation->messages()->create([
        'account_id' => $inbox->account_id,
        'inbox_id' => $inbox->id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => $content,
        'content_type' => Message::CONTENT_TYPES[$contentType],
        'content_attributes' => $attributes,
    ]);
}

it('input_select ra chip gốc trên kênh có outbound_quick_reply', function (string $factoryState) {
    $inbox = Inbox::factory()->{$factoryState}()->create();
    $message = planFor($inbox, 'input_select', [
        'items' => [['title' => 'Có', 'value' => 'yes'], ['title' => 'Không', 'value' => 'no']],
    ], 'Bạn có đồng ý không?');

    $plan = app(DeliveryPlanner::class)->plan($message, $inbox->channel->capabilities());

    expect($plan->level)->toBe(DeliveryLevel::Native);
})->with(['facebookPage', 'telegram', 'line']);

it('input_select trên Facebook vẽ đúng quick_replies kèm payload yona:{id}:{value}', function () {
    $inbox = Inbox::factory()->facebookPage()->create();
    $message = planFor($inbox, 'input_select', [
        'items' => [['title' => 'Có', 'value' => 'yes'], ['title' => 'Không', 'value' => 'no']],
    ], 'Bạn có đồng ý không?');

    $plan = app(DeliveryPlanner::class)->plan($message, $inbox->channel->capabilities());

    expect($plan->parts)->toBe([[
        'text' => 'Bạn có đồng ý không?',
        'quick_replies' => [
            ['content_type' => 'text', 'title' => 'Có', 'payload' => "yona:{$message->id}:yes"],
            ['content_type' => 'text', 'title' => 'Không', 'payload' => "yona:{$message->id}:no"],
        ],
    ]]);
});

it('input_select trên Telegram vẽ inline_keyboard với callback_data {id}:{value}', function () {
    $inbox = Inbox::factory()->telegram()->create();
    $message = planFor($inbox, 'input_select', [
        'items' => [['title' => 'Có', 'value' => 'yes'], ['title' => 'Không', 'value' => 'no']],
    ], 'Bạn có đồng ý không?');

    $plan = app(DeliveryPlanner::class)->plan($message, $inbox->channel->capabilities());

    expect($plan->parts[0]['reply_markup']['inline_keyboard'])->toBe([
        [['text' => 'Có', 'callback_data' => "{$message->id}:yes"]],
        [['text' => 'Không', 'callback_data' => "{$message->id}:no"]],
    ]);
});

it('callback_data Telegram dùng chỉ số khi value dài quá 64 byte', function () {
    $inbox = Inbox::factory()->telegram()->create();
    $longValue = str_repeat('a', 80);
    $message = planFor($inbox, 'input_select', [
        'items' => [['title' => 'Chọn', 'value' => $longValue]],
    ], 'Câu hỏi');

    $plan = app(DeliveryPlanner::class)->plan($message, $inbox->channel->capabilities());

    expect($plan->parts[0]['reply_markup']['inline_keyboard'][0][0]['callback_data'])->toBe("{$message->id}:i0");
});

it('input_select trên Line vẽ flex bubble với nút gửi lại value', function () {
    $inbox = Inbox::factory()->line()->create();
    $message = planFor($inbox, 'input_select', [
        'items' => [['title' => 'Có', 'value' => 'yes']],
    ], 'Bạn có đồng ý không?');

    $plan = app(DeliveryPlanner::class)->plan($message, $inbox->channel->capabilities());

    expect($plan->parts[0]['type'])->toBe('flex')
        ->and($plan->parts[0]['contents']['body']['contents'][1]['action'])
        ->toBe(['type' => 'message', 'label' => 'Có', 'text' => 'yes']);
});

it('input_select trên kênh không khai outbound_quick_reply hạ xuống chữ đánh số', function (string $factoryState) {
    $inbox = Inbox::factory()->{$factoryState}()->create();
    $message = planFor($inbox, 'input_select', [
        'items' => [['title' => 'Có', 'value' => 'yes'], ['title' => 'Không', 'value' => 'no']],
    ], 'Bạn có đồng ý không?');

    $plan = app(DeliveryPlanner::class)->plan($message, $inbox->channel->capabilities());

    expect($plan->level)->toBe(DeliveryLevel::TextNumbered)
        ->and($plan->plainText())->toBe("Bạn có đồng ý không?\n\nTrả lời số:\n1. Có\n2. Không")
        ->and($message->fresh()->content_attributes['delivery'])->toBe('text_numbered');
})->with(['zalo', 'sms']);

it('buttons chưa có renderer gốc nên luôn hạ xuống chữ kèm số dù kênh có outbound_quick_reply', function () {
    $inbox = Inbox::factory()->facebookPage()->create();
    $message = planFor($inbox, 'buttons', [
        'actions' => [
            ['kind' => 'reply', 'label' => 'Đặt hàng', 'value' => 'order'],
            ['kind' => 'link', 'label' => 'Xem thêm', 'url' => 'https://gommoc.vn'],
        ],
    ], 'Bạn muốn làm gì tiếp?');

    $plan = app(DeliveryPlanner::class)->plan($message, $inbox->channel->capabilities());

    expect($plan->level)->toBe(DeliveryLevel::TextNumbered)
        ->and($plan->plainText())->toContain('1. Đặt hàng');
});

it('tin không có lựa chọn hạ xuống chữ thuần, không thêm danh sách số', function () {
    $inbox = Inbox::factory()->facebookPage()->create();
    $message = planFor($inbox, 'buttons', [
        'actions' => [['kind' => 'link', 'label' => 'Xem thêm', 'url' => 'https://gommoc.vn']],
    ], 'Xem sản phẩm mới nhé');

    $plan = app(DeliveryPlanner::class)->plan($message, $inbox->channel->capabilities());

    expect($plan->level)->toBe(DeliveryLevel::Text)
        ->and($plan->plainText())->not->toContain('Trả lời số:');
});

it('tin chữ thuần (không content_type có cấu trúc) giữ nguyên chữ, không đụng content_attributes', function () {
    $inbox = Inbox::factory()->facebookPage()->create();
    $conversation = Conversation::factory()->create(['account_id' => $inbox->account_id, 'inbox_id' => $inbox->id]);
    $message = $conversation->messages()->create([
        'account_id' => $inbox->account_id,
        'inbox_id' => $inbox->id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Chào bạn',
    ]);

    $plan = app(DeliveryPlanner::class)->plan($message, $inbox->channel->capabilities());

    expect($plan->level)->toBe(DeliveryLevel::Text)
        ->and($plan->plainText())->toBe('Chào bạn')
        ->and($message->fresh()->content_attributes)->toBe([]);
});
