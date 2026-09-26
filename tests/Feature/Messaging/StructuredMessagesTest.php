<?php

use App\Builders\Messages\MessageBuilder;
use App\Http\Resources\MessageResource;
use App\Messaging\Structured\AbstractStructuredType;
use App\Messaging\Structured\Choice;
use App\Messaging\Structured\InvalidStructuredPayload;
use App\Messaging\Structured\PayloadContext;
use App\Messaging\Structured\StructuredTypeRegistry;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\Messaging\SubmissionService;
use App\Support\RealtimePayload;
use Illuminate\Contracts\Validation\Factory as ValidationFactory;
use Tests\Support\WidgetSession;

// Lõi tin nhắn có cấu trúc đi qua đường thật: agent tạo tin, khách trả lời từ
// widget, khách gửi yêu cầu đặt hàng từ thẻ sản phẩm.

function structuredConversation(WidgetSession $session): Conversation
{
    return Conversation::factory()->create([
        'account_id' => $session->account->id,
        'inbox_id' => $session->inbox->id,
        'contact_id' => $session->contact->id,
        'contact_inbox_id' => $session->contactInbox->id,
    ]);
}

function agentSends(Conversation $conversation, string $contentType, array $attributes, ?string $content = null): Message
{
    return (new MessageBuilder(User::factory()->create(), $conversation, [
        'content' => $content,
        'content_type' => $contentType,
        'content_attributes' => $attributes,
    ]))->perform();
}

function productCard(Conversation $conversation): Message
{
    return agentSends($conversation, 'cards', ['items' => [[
        'id' => 'binh-lam-40',
        'title' => 'Bình men lam 40cm',
        'media_url' => 'https://cdn.gommoc.vn/binh-lam.jpg',
        'price' => ['amount' => 1250000, 'compare_at' => 1490000],
        'max_quantity' => 2,
        'variants' => [[
            'name' => 'Màu',
            'options' => [
                ['value' => 'lam', 'label' => 'Lam', 'media_url' => 'https://cdn.gommoc.vn/lam.jpg'],
                ['value' => 'ngoc', 'label' => 'Ngọc', 'disabled' => true],
            ],
        ]],
        'actions' => [['kind' => 'order', 'label' => 'Đặt mua']],
    ]]]);
}

beforeEach(fn () => app()->setLocale('vi'));

describe('agent tạo tin', function () {
    it('lưu payload đã chuẩn hoá, tự tính phần trăm giảm', function () {
        $session = WidgetSession::make();
        $card = productCard(structuredConversation($session));

        expect($card->content_attributes['items'][0]['price'])
            ->toBe(['amount' => 1250000, 'currency' => 'VND', 'compare_at' => 1490000, 'discount_percent' => 16]);
    });

    it('API trả 422 khi payload sai, không tạo tin', function () {
        $session = WidgetSession::make();
        $conversation = structuredConversation($session);
        $agent = User::factory()->create();
        AccountUser::factory()->create(['account_id' => $session->account->id, 'user_id' => $agent->id, 'role' => AccountUser::ROLE_AGENT]);
        $session->inbox->addMembers([$agent->id]);
        $before = Message::count();

        $this->actingAs($agent)
            ->postJson("/api/v1/accounts/{$session->account->id}/conversations/{$conversation->display_id}/messages", [
                'content' => 'Xem nhé',
                'content_type' => 'buttons',
                'content_attributes' => ['actions' => [['kind' => 'link', 'label' => 'X', 'url' => 'javascript:alert(1)']]],
            ])
            ->assertStatus(422)
            ->assertJsonPath('error', 'Đường dẫn phải bắt đầu bằng http:// hoặc https://.');

        expect(Message::count())->toBe($before);
    });

    it('không cho client tự ghi khoá của server', function () {
        $session = WidgetSession::make();
        $message = agentSends(structuredConversation($session), 'input_select', [
            'items' => [['title' => 'A']],
            'submitted_values' => [['title' => 'A', 'value' => 'A']],
            'in_reply_to_choice' => 1,
        ], 'Hỏi');

        expect($message->content_attributes)->not->toHaveKeys(['submitted_values', 'in_reply_to_choice']);
    });
});

describe('khách trả lời từ widget', function () {
    it('ghi lựa chọn lên tin gốc và tạo tin trả lời mang nhãn lựa chọn', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);
        $conversation = structuredConversation($session);
        $question = agentSends($conversation, 'input_select', ['items' => [
            ['title' => 'Giờ hành chính', 'value' => 'office_hours'],
            ['title' => 'Buổi tối', 'value' => 'evening'],
        ]], 'Bạn muốn nhận hàng khi nào ạ?');

        $this->patchJson(
            $session->url("messages/{$question->id}"),
            ['message' => ['submitted_values' => [['value' => 'evening']]]],
            $session->headers(),
        )->assertOk();

        expect($question->fresh()->content_attributes['submitted_values'])->toBe([['title' => 'Buổi tối', 'value' => 'evening']]);

        $reply = $conversation->messages()->where('content_attributes->in_reply_to_choice', $question->id)->sole();
        expect($reply->message_type)->toBe(Message::TYPE_INCOMING)
            ->and($reply->content)->toBe('Buổi tối');
    });

    it('từ chối lựa chọn không có trong tin', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);
        $question = agentSends(structuredConversation($session), 'input_select', ['items' => [['title' => 'A', 'value' => 'a']]], 'Hỏi');

        $this->patchJson(
            $session->url("messages/{$question->id}"),
            ['message' => ['submitted_values' => [['value' => 'z']]]],
            $session->headers(),
        )->assertStatus(422);

        expect($question->fresh()->content_attributes)->not->toHaveKey('submitted_values');
    });

    it('chỉ nhận câu trả lời đầu tiên', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);
        $question = agentSends(structuredConversation($session), 'input_select', ['items' => [['title' => 'A', 'value' => 'a'], ['title' => 'B', 'value' => 'b']]], 'Hỏi');
        $submit = fn (string $value) => $this->patchJson(
            $session->url("messages/{$question->id}"),
            ['message' => ['submitted_values' => [['value' => $value]]]],
            $session->headers(),
        );

        $submit('a')->assertOk();
        $submit('b')->assertStatus(422);

        expect($question->fresh()->content_attributes['submitted_values'][0]['value'])->toBe('a');
    });

    it('form kiểm từng ô theo loại', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);
        $form = agentSends(structuredConversation($session), 'form', ['items' => [
            ['name' => 'phone', 'type' => 'phone', 'label' => 'Số điện thoại', 'required' => true],
        ]]);
        $submit = fn (string $phone) => $this->patchJson(
            $session->url("messages/{$form->id}"),
            ['message' => ['submitted_values' => [['name' => 'phone', 'value' => $phone]]]],
            $session->headers(),
        );

        $submit('abc')->assertStatus(422);
        $submit('0912 345 678')->assertOk();

        expect($form->fresh()->content_attributes['submitted_values'])
            ->toBe([['name' => 'phone', 'title' => 'Số điện thoại', 'value' => '0912 345 678']]);
    });
});

describe('khách gửi yêu cầu đặt hàng', function () {
    $send = fn (WidgetSession $session, array $attributes) => test()->postJson(
        $session->url('messages'),
        ['message' => ['content_type' => 'order_request', 'content_attributes' => $attributes]],
        $session->headers(),
    );

    it('lấy tên, ảnh, giá từ thẻ gốc, không tin số client gửi', function () use ($send) {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);
        $card = productCard(structuredConversation($session));

        $send($session, [
            'source_message_id' => $card->id,
            'item_id' => 'binh-lam-40',
            'selections' => ['Màu' => 'lam'],
            'quantity' => 2,
            'note' => 'gói quà giúp mình',
            'unit_price' => ['amount' => 1],
            'title' => 'Hàng giả',
        ])->assertOk();

        $request = Message::query()->where('content_type', Message::CONTENT_TYPES['order_request'])->sole();

        expect($request->content_attributes)->toMatchArray([
            'title' => 'Bình men lam 40cm',
            'media_url' => 'https://cdn.gommoc.vn/lam.jpg',
            'selection_label' => 'Lam',
            'quantity' => 2,
            'unit_price' => ['amount' => 1250000, 'currency' => 'VND'],
            'total' => ['amount' => 2500000, 'currency' => 'VND'],
            'note' => 'gói quà giúp mình',
        ])->and($request->content)->toBe("Yêu cầu đặt hàng: Bình men lam 40cm · Lam × 2 = 2.500.000đ\nGhi chú: gói quà giúp mình");
    });

    it('từ chối biến thể đã hết, số lượng vượt mức, sản phẩm không có', function () use ($send) {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);
        $card = productCard(structuredConversation($session));
        $base = ['source_message_id' => $card->id, 'item_id' => 'binh-lam-40', 'selections' => ['Màu' => 'lam'], 'quantity' => 1];

        $send($session, [...$base, 'selections' => ['Màu' => 'ngoc']])->assertStatus(422);
        $send($session, [...$base, 'selections' => []])->assertStatus(422);
        $send($session, [...$base, 'quantity' => 3])->assertStatus(422);
        $send($session, [...$base, 'item_id' => 'khong-co'])->assertStatus(422);

        expect(Message::query()->where('content_type', Message::CONTENT_TYPES['order_request'])->count())->toBe(0);
    });

    it('agent không gửi được yêu cầu đặt hàng thay khách', function () {
        $session = WidgetSession::make();
        $conversation = structuredConversation($session);
        $card = productCard($conversation);

        expect(fn () => agentSends($conversation, 'order_request', [
            'source_message_id' => $card->id, 'item_id' => 'binh-lam-40', 'selections' => ['Màu' => 'lam'], 'quantity' => 1,
        ]))->toThrow(InvalidStructuredPayload::class);
    });
});

it('thêm một loại tin mới không cần sửa lõi', function () {
    $poll = new class extends AbstractStructuredType
    {
        public function contentType(): string
        {
            return 'webview';
        }

        public function rules(): array
        {
            return ['content' => ['required', 'string'], 'options' => ['required', 'array', 'min:2']];
        }

        public function normalize(array $attributes, PayloadContext $context): array
        {
            return ['options' => array_values(array_map('strval', $attributes['options']))];
        }

        public function choices(array $attributes): array
        {
            return array_map(fn (string $option) => new Choice($option, $option), $attributes['options']);
        }

        public function acceptSubmission(array $attributes, mixed $submitted): array
        {
            return self::acceptedChoice(self::pickChoice($this->choices($attributes), $submitted));
        }

        public function submissionText(array $accepted): string
        {
            return self::choiceLabel($accepted);
        }
    };
    app()->instance(StructuredTypeRegistry::class, new StructuredTypeRegistry([$poll], app(ValidationFactory::class)));

    $session = WidgetSession::make();
    $conversation = structuredConversation($session);
    $message = agentSends($conversation, 'webview', ['options' => ['Có', 'Không']], 'Bạn có đi không?');
    $reply = app(SubmissionService::class)->submit($message, ['value' => 'Có']);

    expect($message->content_attributes['options'])->toBe(['Có', 'Không'])
        ->and($reply->content)->toBe('Có')
        ->and($reply->content_attributes['in_reply_to_choice'])->toBe($message->id);
});

it('webhook gửi kèm tên nút đời trước cho hệ thống khách đang đọc type/text/uri', function () {
    $session = WidgetSession::make();
    $message = agentSends(structuredConversation($session), 'cards', ['items' => [[
        'title' => 'Cốc men hoả biến',
        'actions' => [['kind' => 'link', 'label' => 'Xem', 'url' => 'https://gommoc.vn/coc'], ['kind' => 'order', 'label' => 'Đặt mua']],
    ]]]);

    $actions = MessageResource::webhookData($message)['content_attributes']['items'][0]['actions'];

    expect($actions[0])->toMatchArray(['kind' => 'link', 'type' => 'link', 'text' => 'Xem', 'uri' => 'https://gommoc.vn/coc'])
        ->and($actions[1])->toBe(['kind' => 'order', 'label' => 'Đặt mua']);
});

it('payload hội thoại có dòng xem trước cho tin có cấu trúc, tin thường để null', function () {
    $session = WidgetSession::make();
    $conversation = structuredConversation($session);
    $card = productCard($conversation);
    $plain = $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Chào chị',
    ]);

    expect(MessageResource::pushEventData($card)['preview_text'])->toContain('Bình men lam 40cm')
        ->and(MessageResource::pushEventData($plain)['preview_text'])->toBeNull();
});

it('thẻ sản phẩm do menu "Gửi thẻ" dựng (không có id, giá không có tiền tệ) được máy chủ nhận', function () {
    $session = WidgetSession::make();
    $conversation = structuredConversation($session);
    $agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $session->account->id, 'user_id' => $agent->id, 'role' => AccountUser::ROLE_AGENT]);
    $session->inbox->addMembers([$agent->id]);

    $this->actingAs($agent)
        ->postJson("/api/v1/accounts/{$session->account->id}/conversations/{$conversation->display_id}/messages", [
            'private' => false,
            'content_type' => 'cards',
            'content_attributes' => ['items' => [[
                'title' => 'Bình men lam',
                'price' => ['amount' => 450000, 'compare_at' => 530000],
                'max_quantity' => 2,
                'variants' => [['name' => 'Màu', 'options' => [['value' => 'Lam', 'label' => 'Lam'], ['value' => 'Ngà', 'label' => 'Ngà']]]],
                'actions' => [['kind' => 'order', 'label' => 'Đặt mua'], ['kind' => 'link', 'label' => 'Xem', 'url' => 'https://gommoc.vn/binh']],
            ]]],
        ])
        ->assertOk()
        ->assertJsonPath('content_type', 'cards')
        ->assertJsonPath('content_attributes.items.0.id', 'item-1')
        ->assertJsonPath('content_attributes.items.0.price.discount_percent', 15)
        // Danh sách hội thoại lấy dòng xem trước từ chính phản hồi gửi tin (tin thẻ không có content).
        ->assertJsonPath('preview_text', fn (?string $preview) => str_contains((string) $preview, 'Bình men lam'));
});

it('payload realtime của danh sách hội thoại giữ dòng xem trước của tin có cấu trúc', function () {
    $session = WidgetSession::make();
    $conversation = structuredConversation($session);
    productCard($conversation);

    $payload = RealtimePayload::conversation($conversation->fresh());

    expect($payload['last_non_activity_message']['preview_text'])->toContain('Bình men lam 40cm');
});
