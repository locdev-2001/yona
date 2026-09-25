<?php

use App\Builders\Messages\MessageBuilder;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\MessageAccessToken;
use App\Models\User;
use App\Services\Messaging\PublicFlowService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Tests\Support\WidgetSession;

// Trang công khai theo token (`/m/{token}`, phase-05 §C) — GET trang, GET/POST
// API. Không đăng nhập: bằng chứng danh tính DUY NHẤT là token trên URL.

function flowConversation(?WidgetSession $session = null): Conversation
{
    return $session === null
        ? Conversation::factory()->create()
        : Conversation::factory()->create([
            'account_id' => $session->account->id,
            'inbox_id' => $session->inbox->id,
            'contact_id' => $session->contact->id,
            'contact_inbox_id' => $session->contactInbox->id,
        ]);
}

function flowAgentSends(Conversation $conversation, string $contentType, array $attributes, ?string $content = null): Message
{
    return (new MessageBuilder(User::factory()->create(), $conversation, [
        'content' => $content,
        'content_type' => $contentType,
        'content_attributes' => $attributes,
    ]))->perform();
}

function flowProductCard(Conversation $conversation): Message
{
    return flowAgentSends($conversation, 'cards', ['items' => [[
        'id' => 'binh-lam-40',
        'title' => 'Bình men lam 40cm',
        'price' => ['amount' => 1250000],
        'max_quantity' => 2,
        'variants' => [[
            'name' => 'Màu',
            'options' => [
                ['value' => 'lam', 'label' => 'Lam'],
                ['value' => 'ngoc', 'label' => 'Ngọc', 'disabled' => true],
            ],
        ]],
        'actions' => [['kind' => 'order', 'label' => 'Đặt mua']],
    ]]]);
}

function issueFlowToken(Message $message, string $purpose, ?string $itemId = null): string
{
    $url = app(PublicFlowService::class)->issue($message, $purpose, $itemId);

    return Str::afterLast($url, '/');
}

beforeEach(function () {
    app()->setLocale('vi');
    // Tạo tin outgoing tự dispatch gửi thật (Message::booted()) — chỉ quan tâm
    // trang công khai ở đây nên fake mọi request ra ngoài.
    Http::fake();
    // Test khác trong file này cũng POST /submit — reset hạn mức theo IP để không
    // cộng dồn giữa các test (hạn theo token thì mỗi test có token riêng, không cần).
    RateLimiter::clear('ip:127.0.0.1');
});

describe('chống dò token', function () {
    it('token sai, hết hạn, đã dùng đều trả 404 giống nhau ở trang và ở API', function () {
        $message = flowAgentSends(flowConversation(), 'webview', ['page' => 'schedule', 'title' => 'Chọn lịch', 'data' => ['slots' => []]]);
        $expired = issueFlowToken($message, 'schedule');
        MessageAccessToken::query()->where('token_hash', hash('sha256', $expired))->update(['expires_at' => now()->subMinute()]);

        foreach (['token-khong-ton-tai', $expired] as $token) {
            $this->get("/m/{$token}")->assertNotFound();
            $this->getJson("/public/api/v1/flows/{$token}")->assertNotFound();
        }
    });

    it('token vừa dùng xong (consumed) cũng 404', function () {
        $message = flowAgentSends(flowConversation(), 'webview', [
            'page' => 'schedule',
            'title' => 'Chọn lịch',
            'data' => ['slots' => [['date' => '2026-09-27', 'label' => '8:00 đến 10:00', 'value' => 't7-am']]],
        ]);
        $token = issueFlowToken($message, 'schedule');

        $this->postJson("/public/api/v1/flows/{$token}/submit", ['submitted_values' => [['value' => 't7-am']]])->assertOk();

        $this->getJson("/public/api/v1/flows/{$token}")->assertNotFound();
    });
});

describe('trang schedule', function () {
    it('trả đúng payload rồi tạo tin trả lời khi gửi hợp lệ', function () {
        $conversation = flowConversation();
        $message = flowAgentSends($conversation, 'webview', [
            'page' => 'schedule',
            'title' => 'Chọn lịch nhận hàng',
            'subtitle' => 'Còn chỗ từ thứ Bảy',
            'data' => ['slots' => [['date' => '2026-09-27', 'label' => '8:00 đến 10:00', 'value' => 't7-am']]],
        ]);
        $token = issueFlowToken($message, 'schedule');

        $show = $this->getJson("/public/api/v1/flows/{$token}")->assertOk();
        expect($show->json('purpose'))->toBe('schedule')
            ->and($show->json('title'))->toBe('Chọn lịch nhận hàng')
            ->and($show->json('data.slots.0.value'))->toBe('t7-am');

        $before = Message::count();
        $this->postJson("/public/api/v1/flows/{$token}/submit", [
            'submitted_values' => [['title' => '8:00 đến 10:00', 'value' => 't7-am']],
        ])->assertOk();

        expect(Message::count())->toBe($before + 1);
        // messages() có sẵn orderBy('created_at') — reorder theo id để chắc lấy tin mới nhất.
        $reply = Message::query()->where('conversation_id', $conversation->id)->reorder('id', 'desc')->first();
        expect($reply->isIncoming())->toBeTrue()
            ->and($message->fresh()->content_attributes['submitted_values'])->toBe([['title' => '8:00 đến 10:00', 'value' => 't7-am']]);
    });
});

describe('trang product — đặt hàng', function () {
    it('đặt hợp lệ tạo order_request, không tin giá client gửi', function () {
        $conversation = flowConversation();
        $card = flowProductCard($conversation);
        $token = issueFlowToken($card, 'product', 'binh-lam-40');

        $before = Message::count();
        $this->postJson("/public/api/v1/flows/{$token}/submit", [
            'selections' => [['name' => 'Màu', 'value' => 'lam']],
            'quantity' => 2,
            'unit_price' => ['amount' => 1],
        ])->assertOk();

        expect(Message::count())->toBe($before + 1);
        $request = Message::query()->where('content_type', Message::CONTENT_TYPES['order_request'])->sole();
        expect($request->content_attributes)->toMatchArray([
            'title' => 'Bình men lam 40cm',
            'quantity' => 2,
            'unit_price' => ['amount' => 1250000, 'currency' => 'VND'],
            'total' => ['amount' => 2500000, 'currency' => 'VND'],
        ]);

        // Trang product không bị khoá sau khi đặt — khách có thể quay lại đặt thêm.
        $this->getJson("/public/api/v1/flows/{$token}")->assertOk();
    });

    it('biến thể sai hoặc đã hết trả 422, không tạo tin', function () {
        $card = flowProductCard(flowConversation());
        $token = issueFlowToken($card, 'product', 'binh-lam-40');
        $before = Message::count();

        $this->postJson("/public/api/v1/flows/{$token}/submit", [
            'selections' => [['name' => 'Màu', 'value' => 'ngoc']],
            'quantity' => 1,
        ])->assertStatus(422);

        expect(Message::count())->toBe($before);
    });
});

it('trang order_tracking và bank_transfer chỉ để xem, không nhận submit', function (string $purpose, array $data) {
    $message = flowAgentSends(flowConversation(), 'webview', ['page' => $purpose, 'title' => 'X', 'data' => $data]);
    $token = issueFlowToken($message, $purpose);

    $this->getJson("/public/api/v1/flows/{$token}")->assertOk();
    $this->postJson("/public/api/v1/flows/{$token}/submit", [])->assertStatus(422);
})->with([
    'order_tracking' => ['order_tracking', ['order_ref' => 'GM1024', 'status' => 'delivering']],
    'bank_transfer' => ['bank_transfer', ['bank_name' => 'Vietcombank', 'account_number' => '0123456789']],
]);

it('giới hạn số lần gửi theo token', function () {
    $message = flowAgentSends(flowConversation(), 'webview', [
        'page' => 'schedule',
        'title' => 'Chọn lịch',
        'data' => ['slots' => [['date' => '2026-09-27', 'label' => '8:00 đến 10:00', 'value' => 't7-am']]],
    ]);
    $token = issueFlowToken($message, 'schedule');

    // Gửi sai để không bị token tự khoá (already_submitted), riêng đếm lượt gọi.
    for ($i = 0; $i < 5; $i++) {
        $this->postJson("/public/api/v1/flows/{$token}/submit", ['submitted_values' => [['value' => 'sai']]])->assertStatus(422);
    }

    $this->postJson("/public/api/v1/flows/{$token}/submit", ['submitted_values' => [['value' => 'sai']]])->assertStatus(429);
});

describe('header frame-ancestors', function () {
    it('kênh website: self kèm domain đã khai', function () {
        $session = WidgetSession::make(['allowed_domains' => 'shop.acme.vn']);
        $message = flowAgentSends(flowConversation($session), 'webview', ['page' => 'schedule', 'title' => 'X', 'data' => []]);
        $token = issueFlowToken($message, 'schedule');

        $this->get("/m/{$token}")->assertHeader('Content-Security-Policy', "frame-ancestors 'self' shop.acme.vn");
    });

    it('kênh website chưa khai domain: không gửi header, sheet nhúng được trên trang của shop như chính widget', function () {
        $session = WidgetSession::make(['allowed_domains' => '']);
        $message = flowAgentSends(flowConversation($session), 'webview', ['page' => 'schedule', 'title' => 'X', 'data' => []]);
        $token = issueFlowToken($message, 'schedule');

        $this->get("/m/{$token}")->assertOk()->assertHeaderMissing('Content-Security-Policy');
    });

    it('kênh không phải website: chỉ self', function () {
        $inbox = Inbox::factory()->zalo()->create();
        $conversation = Conversation::factory()->create(['account_id' => $inbox->account_id, 'inbox_id' => $inbox->id]);
        $message = flowAgentSends($conversation, 'webview', ['page' => 'schedule', 'title' => 'X', 'data' => []]);
        $token = issueFlowToken($message, 'schedule');

        $this->get("/m/{$token}")->assertHeader('Content-Security-Policy', "frame-ancestors 'self'");
    });
});

it('form dài gửi qua kênh chữ: link planner phát mở được trang form và gửi được câu trả lời', function () {
    $conversation = flowConversation();
    $message = flowAgentSends($conversation, 'form', ['items' => [
        ['name' => 'ho_ten', 'type' => 'text', 'label' => 'Họ tên'],
        ['name' => 'dia_chi', 'type' => 'text_area', 'label' => 'Địa chỉ giao hàng'],
    ]], 'Cho shop xin thông tin giao hàng nhé');
    $token = issueFlowToken($message, 'form');

    $this->getJson("/public/api/v1/flows/{$token}")
        ->assertOk()
        ->assertJsonPath('purpose', 'form')
        ->assertJsonPath('data.items.1.name', 'dia_chi');

    $this->postJson("/public/api/v1/flows/{$token}/submit", [
        'submitted_values' => [['name' => 'ho_ten', 'value' => 'Chị Hoa'], ['name' => 'dia_chi', 'value' => '12 Hàng Bông']],
    ])->assertOk();

    expect($message->fresh()->content_attributes['submitted_values'])->toHaveCount(2);
    $this->getJson("/public/api/v1/flows/{$token}")->assertNotFound();
});
