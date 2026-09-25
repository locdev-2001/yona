<?php

use App\Messaging\Delivery\CardImageService;
use App\Messaging\Delivery\DeliveryLevel;
use App\Messaging\Delivery\DeliveryPlanner;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

// Ảnh thẻ (satori, phase-06 §6b) cho kênh không có dạng gốc nhưng nhận được ảnh.
// Tách khỏi DeliveryPlannerTest.php: file đó có `beforeEach(fn () => Http::fake())`
// KHÔNG điều kiện — bất kỳ `Http::fake([...])` nào gọi sau trong một test cũng
// thua vì Laravel chọn stub KHỚP ĐẦU TIÊN theo thứ tự đăng ký, không theo độ cụ
// thể (đã kiểm chứng thực nghiệm). Cần đáp thân HTTP thật (thành công/thất bại)
// nên file này tự quản Http::fake() của riêng nó, không thừa hưởng beforeEach đó.

// Tin không tự gửi thật qua SendReplyJob (queue giả) — file này chỉ quan tâm
// DeliveryPlanner/CardImageService, không quan tâm luồng gửi Zalo.
beforeEach(function () {
    app()->setLocale('vi');
    Queue::fake();
    Storage::fake('public');
    config(['zalo.bridge.send_secret' => 'test-secret']);
});

function cardMessage(Inbox $inbox, array $attributes, string $content = 'Xem sản phẩm này nhé'): Message
{
    $conversation = Conversation::factory()->create(['account_id' => $inbox->account_id, 'inbox_id' => $inbox->id]);

    return $conversation->messages()->create([
        'account_id' => $inbox->account_id,
        'inbox_id' => $inbox->id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => $content,
        'content_type' => Message::CONTENT_TYPES['cards'],
        'content_attributes' => $attributes,
    ]);
}

it('planner chọn image_text cho Zalo + cards khi bridge vẽ ảnh thành công', function () {
    Http::fake([zaloBridgePattern('render/card') => Http::response('fake-png-bytes', 200, ['Content-Type' => 'image/png'])]);

    $inbox = Inbox::factory()->zalo()->create();
    $message = cardMessage($inbox, ['items' => [['title' => 'Bình men lam', 'price' => 450000]]]);

    $plan = app(DeliveryPlanner::class)->plan($message, $inbox->channel->capabilities());

    expect($plan->level)->toBe(DeliveryLevel::ImageText)
        ->and($plan->imageUrl())->toBeString()->toContain('card-images/')
        ->and($plan->plainText())->toContain('Xem sản phẩm này nhé')
        ->and($message->fresh()->content_attributes['delivery'])->toBe('image_text');

    Http::assertSent(fn ($request) => str_ends_with($request->url(), '/render/card')
        && $request->hasHeader('X-Bridge-Send-Secret', 'test-secret')
        && $request['kind'] === 'cards');
});

it('planner rơi về text_numbered khi bridge vẽ ảnh lỗi, choices vẫn đánh số', function () {
    Http::fake([zaloBridgePattern('render/card') => Http::response(['ok' => false], 500)]);
    Log::spy();

    $inbox = Inbox::factory()->zalo()->create();
    $message = cardMessage($inbox, [
        'items' => [['title' => 'Bình men lam', 'price' => 450000, 'actions' => [['kind' => 'reply', 'label' => 'Đặt mua', 'value' => 'order']]]],
    ]);

    $plan = app(DeliveryPlanner::class)->plan($message, $inbox->channel->capabilities());

    expect($plan->level)->toBe(DeliveryLevel::TextNumbered)
        ->and($plan->plainText())->toContain('1. Đặt mua')
        ->and($message->fresh()->content_attributes['delivery'])->toBe('text_numbered');

    Log::shouldHaveReceived('info')->atLeast()->once()->withArgs(fn (string $event, array $context) => $event === 'messaging.delivery.degraded' && $context['level'] === 'image_failed');
});

it('bridge quá giờ (timeout) vẫn hạ xuống chữ, không ném lỗi ra ngoài', function () {
    Http::fake(fn () => throw new ConnectionException('render timed out'));

    $inbox = Inbox::factory()->zalo()->create();
    $message = cardMessage($inbox, ['items' => [['title' => 'Bình men lam']]]);

    $plan = app(DeliveryPlanner::class)->plan($message, $inbox->channel->capabilities());

    expect($plan->level)->toBe(DeliveryLevel::Text)
        ->and($plan->plainText())->toContain('Xem sản phẩm này nhé');
});

it('kênh không khai outbound_image không thử vẽ ảnh, hạ thẳng xuống chữ', function () {
    Http::fake();

    $inbox = Inbox::factory()->twitterProfile()->create();
    $message = cardMessage($inbox, ['items' => [['title' => 'Bình men lam']]]);

    $plan = app(DeliveryPlanner::class)->plan($message, $inbox->channel->capabilities());

    expect($plan->level)->toBe(DeliveryLevel::Text);
    Http::assertNothingSent();
});

it('CardImageService không gọi bridge lần hai cho cùng payload — dùng cache trên disk', function () {
    Http::fake([zaloBridgePattern('render/card') => Http::response('fake-png-bytes', 200, ['Content-Type' => 'image/png'])]);

    $inbox = Inbox::factory()->zalo()->create();
    $message = cardMessage($inbox, ['items' => [['title' => 'Bình men lam', 'price' => 450000]]]);

    $first = app(CardImageService::class)->for($message);
    $second = app(CardImageService::class)->for($message);

    expect($first)->not->toBeNull()->and($second)->toBe($first);
    Http::assertSentCount(1);
});

it('CardImageService trả null im lặng khi bridge chưa cấu hình secret, không ghi log lỗi', function () {
    config(['zalo.bridge.send_secret' => '']);
    Http::fake();
    Log::spy();

    $inbox = Inbox::factory()->zalo()->create();
    $message = cardMessage($inbox, ['items' => [['title' => 'Bình men lam']]]);

    expect(app(CardImageService::class)->for($message))->toBeNull();
    Http::assertNothingSent();
    Log::shouldNotHaveReceived('info');
});
